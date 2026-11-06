// Makes an existing account an admin. The admin area can only promote others once one admin exists.
// Usage: pnpm admin:grant <email>   (uses DATABASE_URL from .env, or from the environment)
import postgres from 'postgres';

const email = process.argv[2];
if (!email) {
	console.error('Usage: pnpm admin:grant <email>');
	process.exit(1);
}
if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
try {
	const rows = await sql`
		update "user" set is_admin = true, banned_at = null
		where lower(email) = lower(${email})
		returning name, email`;
	if (!rows.length) {
		console.error(`No account with the email ${email}.`);
		process.exitCode = 1;
	} else {
		console.log(`${rows[0].name} <${rows[0].email}> is now an admin.`);
	}
} finally {
	await sql.end();
}
