import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode, FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EditorContext = createContext<{ session: Session | null; canEdit: boolean }>({ session: null, canEdit: false });

export function EditorProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    // INITIAL_SESSION restores a session without a race against a separate getSession call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);
  const { data: canEdit = false } = useQuery({
    queryKey: ["equipment-editor", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("can_edit_equipment");
      if (error) throw error;
      return data === true;
    },
    retry: false,
    refetchOnWindowFocus: "always",
  });
  return <EditorContext.Provider value={{ session, canEdit: !!session && canEdit }}>{children}</EditorContext.Provider>;
}

export const useEditorAccess = () => useContext(EditorContext);

export function EditorAccess() {
  const { session, canEdit } = useEditorAccess();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError("Unable to sign in. Check your staff account details.");
      else { setPassword(""); setOpen(false); }
    } catch { setError("Unable to sign in. Please try again."); }
    finally { setBusy(false); }
  };
  return <div className="flex items-center gap-3">
    {session ? <>
      <span className="text-sm text-muted-foreground">{canEdit ? "Staff access" : "Read-only access"}</span>
      <Button variant="outline" onClick={async () => {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) setError("Unable to sign out. Please try again.");
      }}>Sign out</Button>
    </> : <Button variant="outline" onClick={() => setOpen(true)}>Staff sign in</Button>}
    {error && !open && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); setPassword(""); setError(""); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Staff sign in</DialogTitle>
          <DialogDescription>Use your approved staff account to manage equipment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={signIn} className="space-y-4">
          <div><Label htmlFor="staff-email">Email</Label><Input id="staff-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div><Label htmlFor="staff-password">Password</Label><Input id="staff-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
