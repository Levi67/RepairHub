<script lang="ts">
	import {
		statusTone,
		type OrderStatus,
		type QuoteStatus,
		type RequestStatus
	} from '#lib/status.ts';

	let { status, label }: { status: RequestStatus | QuoteStatus | OrderStatus; label: string } =
		$props();
</script>

<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium {statusTone(status)}">
	{label}
</span>
