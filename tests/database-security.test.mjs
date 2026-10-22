import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('database rejects unauthorized writes and records transitions atomically', async () => {
  const db = new PGlite();
  const editor = '11111111-1111-4111-8111-111111111111';
  const outsider = '22222222-2222-4222-8222-222222222222';
  const equipmentId = '33333333-3333-4333-8333-333333333333';
  const as = async (role, user = '') => {
    await db.exec(`RESET ROLE; SET ROLE ${role}`);
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user]);
  };
  const countHistory = async () => Number((await db.query('SELECT count(*) AS n FROM public.equipment_status_history')).rows[0].n);
  try {
    await db.exec(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
      INSERT INTO auth.users VALUES ('${editor}'), ('${outsider}');
    `);
    const directory = new URL('../supabase/migrations/', import.meta.url);
    for (const name of (await readdir(directory)).filter(n => n.endsWith('.sql')).sort()) {
      await db.exec(await readFile(new URL(name, directory), 'utf8'));
    }
    await db.query('INSERT INTO public.equipment_editors (user_id) VALUES ($1)', [editor]);
    for (const table of ['motors', 'gearboxes', 'pumps']) {
      const extra = table === 'motors' ? ', hp, rpm' : table === 'gearboxes' ? ', reduction_ratio, shaft_diameter' : ', rpm';
      const values = table === 'motors' ? ', 5, 1500' : table === 'gearboxes' ? ", '10:1', 20" : ', 1500';
      await db.exec(`INSERT INTO public.${table} (id, serial_number, location${extra}) VALUES ('${equipmentId}', 'TEST-${table}', 'Plant A'${values})`);
    }
    await as('anon');
    assert.equal((await db.query('SELECT * FROM public.motors')).rows.length, 1, 'public QR viewing remains available');
    await assert.rejects(db.exec("UPDATE public.motors SET location = 'tampered'"), /permission denied/);
    await assert.rejects(db.exec("INSERT INTO public.equipment_status_history (equipment_type,equipment_id,from_status,to_status) VALUES ('motors','33333333-3333-4333-8333-333333333333','active','defunct')"), /permission denied/);
    await assert.rejects(db.query("SELECT public.change_equipment_status('motors',$1,'defunct','tampered')", [equipmentId]), /permission denied/);

    await as('authenticated', outsider);
    assert.equal((await db.query('SELECT public.can_edit_equipment() AS allowed')).rows[0].allowed, false);
    await assert.rejects(db.exec("INSERT INTO public.motors (serial_number,hp,rpm,location) VALUES ('BAD',1,1,'bad')"), /row-level security/);
    assert.equal((await db.exec("UPDATE public.motors SET qr_code = 'tampered'"))[0].affectedRows, 0);
    assert.equal((await db.exec('DELETE FROM public.motors'))[0].affectedRows, 0);
    await assert.rejects(db.query('INSERT INTO public.equipment_editors (user_id) VALUES ($1)', [outsider]), /permission denied/);
    await assert.rejects(db.query("SELECT public.change_equipment_status('motors',$1,'defunct','tampered')", [equipmentId]), /Approved equipment editor/);

    await as('authenticated', editor);
    assert.equal((await db.query('SELECT public.can_edit_equipment() AS allowed')).rows[0].allowed, true);
    await assert.rejects(db.exec("UPDATE public.motors SET status = 'defunct'"), /permission denied/);
    await assert.rejects(db.exec('DELETE FROM public.equipment_status_history'), /permission denied/);
    await assert.rejects(db.query("SELECT public.change_equipment_status('other_table',$1,'defunct','reason')", [equipmentId]), /Invalid equipment type/);
    await assert.rejects(db.query("SELECT public.change_equipment_status('motors',$1,'for_repair')", [equipmentId]), /reason is required/);
    assert.equal(await countHistory(), 0);
    for (const table of ['motors', 'gearboxes', 'pumps']) {
      await db.query("SELECT public.change_equipment_status($1,$2,'for_repair','Bearing fault')", [table, equipmentId]);
      await assert.rejects(db.query("SELECT public.change_equipment_status($1,$2,'active')", [table, equipmentId]), /location is required/);
      await db.query("SELECT public.change_equipment_status($1,$2,'active',NULL,'Plant B')", [table, equipmentId]);
    }
    assert.equal(await countHistory(), 6);
    assert.equal((await db.query("SELECT active_location FROM public.equipment_status_history WHERE equipment_type='motors' AND from_status='active'")).rows[0].active_location, 'Plant A');

    // Simulate an audit-write failure: the equipment update must roll back too.
    await as('postgres');
    await db.exec("CREATE FUNCTION public.fail_history_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated history failure'; END $$; CREATE TRIGGER fail_history_test BEFORE INSERT ON public.equipment_status_history FOR EACH ROW EXECUTE FUNCTION public.fail_history_test()");
    await as('authenticated', editor);
    await assert.rejects(db.query("SELECT public.change_equipment_status('motors',$1,'in_storage')", [equipmentId]), /simulated history failure/);
    assert.equal((await db.query('SELECT status FROM public.motors')).rows[0].status, 'active');
    assert.equal(await countHistory(), 6);
    await as('postgres');
    await db.exec('DROP TRIGGER fail_history_test ON public.equipment_status_history');
    await as('authenticated', editor);
    await db.query("SELECT public.change_equipment_status('motors',$1,'defunct','Retired')", [equipmentId]);
    await assert.rejects(db.query("SELECT public.change_equipment_status('motors',$1,'active',NULL,'Plant C')", [equipmentId]), /Defunct equipment/);

    // Removing membership takes effect immediately, even with the same JWT identity.
    await as('postgres');
    await db.exec('DELETE FROM public.equipment_editors');
    await as('authenticated', editor);
    await assert.rejects(db.query("SELECT public.change_equipment_status('pumps',$1,'in_storage')", [equipmentId]), /Approved equipment editor/);
  } finally { await db.close(); }
});
