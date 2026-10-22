const [major, minor, patch] = process.versions.node.split('.').map(Number);
if (major !== 24 || minor < 22 || (minor === 22 && patch < 1)) {
  console.error('Use Node.js 24.22.1 or a newer 24.x security release (see .nvmrc).');
  process.exit(1);
}
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  console.error('TLS certificate verification must remain enabled.');
  process.exit(1);
}
