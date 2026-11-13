<script lang="ts">
	// Password re-entry for destructive super admin actions (checked on the server).
	let { label = 'Dein Passwort zur Bestätigung' }: { label?: string } = $props();
</script>

<label class="block">
	<span class="text-sm font-medium">{label}</span>
	<input
		type="password"
		name="ownPassword"
		autocomplete="current-password"
		required
		class="mt-1 block w-full max-w-xs rounded-md border-edge"
	/>
</label>
