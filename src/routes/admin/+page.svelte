<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { format } from 'date-fns';

	export let data: PageData;

	const typeEmoji: Record<string, string> = { live_music: '🎵', theater: '🎭', sports: '🏟️', comedy: '😂', festival: '🎪', food: '🍽️', art: '🎨', cinema: '🎬', other: '📅' };

	let pending = data.pending;
	let processing = new Set<number>();

	async function handleSubmit(id: number, action: 'approve' | 'reject') {
		processing = processing.add(id);
		try {
			const res = await fetch('/api/admin/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, action }),
			});
			if (res.ok) {
				pending = pending.filter((p) => p.id !== id);
			}
		} finally {
			processing = new Set([...processing].filter((x) => x !== id));
			await invalidateAll();
		}
	}
</script>

<svelte:head>
	<title>Admin | Gendo</title>
</svelte:head>

<div class="min-h-screen bg-gendo-bg text-white">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
		<a href="/" class="text-gendo-accent hover:text-white text-sm mb-6 inline-block">← Gendo</a>
		<h1 class="text-3xl font-bold mb-8">⚙️ Admin</h1>

		<!-- Stats -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
			<div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-4">
				<p class="text-2xl font-bold text-gendo-accent">{data.stats.totalEvents}</p>
				<p class="text-sm text-gray-500">Events</p>
			</div>
			<div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-4">
				<p class="text-2xl font-bold text-gendo-accent">{data.stats.totalCities}</p>
				<p class="text-sm text-gray-500">Cities</p>
			</div>
			<div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-4">
				<p class="text-2xl font-bold text-gendo-accent">{data.stats.totalVenues}</p>
				<p class="text-sm text-gray-500">Venues</p>
			</div>
			<div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-4">
				<p class="text-2xl font-bold text-amber-400">{data.stats.pendingSubmissions}</p>
				<p class="text-sm text-gray-500">Pending</p>
			</div>
		</div>

		<!-- By source -->
		<div class="mb-10">
			<h2 class="text-lg font-semibold mb-3">Events by source</h2>
			<div class="flex flex-wrap gap-2">
				{#each data.bySource as s}
					<span class="bg-gendo-muted px-3 py-1 rounded-lg text-sm text-gendo-cream/80">
						{s.source}: {s.n}
					</span>
				{/each}
			</div>
		</div>

		<!-- Refresh -->
		<div class="mb-10">
			<a href="/" class="inline-flex items-center gap-2 bg-gendo-accent hover:bg-gendo-accent/90 text-white px-4 py-2 rounded-xl text-sm font-medium">
				🔄 Refresh all data (from home)
			</a>
		</div>

		<!-- Pending submissions -->
		<div>
			<h2 class="text-lg font-semibold mb-4">Pending submissions</h2>
			{#if pending.length === 0}
				<p class="text-gray-500 py-8">No pending submissions.</p>
			{:else}
				<div class="space-y-4">
					{#each pending as sub}
						<div class="bg-gendo-surface border border-white/[0.06] rounded-xl p-4">
							<div class="flex items-start justify-between gap-4 flex-wrap">
								<div class="flex-1 min-w-0">
									<h3 class="font-semibold text-white">{sub.title}</h3>
									<div class="flex flex-wrap gap-2 mt-1 text-sm text-gray-400">
										<span>{typeEmoji[sub.type] ?? '📅'} {sub.type}</span>
										<span>📍 {sub.city_name}</span>
										{#if sub.venue_name}<span>@ {sub.venue_name}</span>{/if}
										<span>🕐 {format(new Date(sub.date_start * 1000), 'MMM d, yyyy h:mm a')}</span>
										{#if sub.price === 'free'}<span class="text-green-400">FREE</span>{:else if sub.price_amount}<span>${sub.price_amount}</span>{/if}
									</div>
									{#if sub.description}
										<p class="mt-2 text-sm text-gray-500 line-clamp-2">{sub.description}</p>
									{/if}
									{#if sub.submitter_email}
										<p class="mt-1 text-xs text-gray-600">From: {sub.submitter_email}</p>
									{/if}
								</div>
								<div class="flex gap-2 flex-shrink-0">
									<button
										on:click={() => handleSubmit(sub.id, 'approve')}
										disabled={processing.has(sub.id)}
										class="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
										Approve
									</button>
									<button
										on:click={() => handleSubmit(sub.id, 'reject')}
										disabled={processing.has(sub.id)}
										class="bg-red-900 hover:bg-red-800 disabled:opacity-50 text-red-200 px-3 py-1.5 rounded-lg text-sm font-medium">
										Reject
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
