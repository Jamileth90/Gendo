<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	const EVENT_TYPES = [
		{ id: 'live_music', label: '🎵 Live Music' },
		{ id: 'theater', label: '🎭 Theater' },
		{ id: 'sports', label: '🏟️ Sports' },
		{ id: 'comedy', label: '😂 Comedy' },
		{ id: 'festival', label: '🎪 Festival' },
		{ id: 'food', label: '🍽️ Food & Drink' },
		{ id: 'art', label: '🎨 Art' },
		{ id: 'cinema', label: '🎬 Cinema' },
		{ id: 'other', label: '📅 Other' },
	];

	let title = '';
	let description = '';
	let dateStart = '';
	let dateEnd = '';
	let cityId = '';
	let venueName = '';
	let venueAddress = '';
	let type = 'other';
	let price = 'free';
	let priceAmount = '';
	let sourceUrl = '';
	let submitterEmail = '';
	let submitterName = '';
	let submitting = false;
	let message = '';
	let error = '';

	async function submit() {
		if (!title.trim()) { error = 'Title is required'; return; }
		error = '';
		message = '';
		submitting = true;
		try {
			const res = await fetch('/api/submit-event', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					description,
					dateStart: dateStart || null,
					dateEnd: dateEnd || null,
					cityId: cityId ? parseInt(cityId, 10) : null,
					cityName: cityId ? (data.cities.find((c: {id:number}) => c.id === parseInt(cityId, 10))?.name ?? null) : null,
					venueName: venueName || null,
					venueAddress: venueAddress || null,
					type,
					price,
					priceAmount: priceAmount ? parseFloat(priceAmount) : null,
					sourceUrl: sourceUrl || null,
					submitterEmail: submitterEmail || null,
					submitterName: submitterName || null,
				}),
			});
			const d = await res.json();
			if (res.ok && d.success) {
				message = d.message;
				title = ''; description = ''; dateStart = ''; dateEnd = ''; cityId = '';
				venueName = ''; venueAddress = ''; type = 'other'; price = 'free'; priceAmount = '';
				sourceUrl = ''; submitterEmail = ''; submitterName = '';
			} else {
				error = d.error ?? 'Failed to submit';
			}
		} catch {
			error = 'Network error';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Submit Event | Gendo</title>
</svelte:head>

<div class="min-h-screen bg-gendo-bg text-white">
	<div class="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
		<a href="/" class="text-gendo-accent hover:text-white text-sm mb-6 inline-block">← Gendo</a>
		<h1 class="text-3xl font-bold mb-2">➕ Submit Event</h1>
		<p class="text-gray-400 mb-8">Share an event with the community. We'll review it before publishing.</p>

		{#if message}
			<div class="mb-6 p-4 rounded-xl bg-emerald-950/50 border border-emerald-600/40 text-emerald-200">
				{message}
			</div>
		{/if}
		{#if error}
			<div class="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-600/40 text-red-200">
				{error}
			</div>
		{/if}

		<form on:submit|preventDefault={submit} class="space-y-5">
			<div>
				<label class="block text-sm font-medium text-gray-300 mb-1">Event title *</label>
				<input bind:value={title} type="text" required placeholder="St. Patrick's Day at Big Grove"
					class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent" />
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-300 mb-1">Description</label>
				<textarea bind:value={description} rows="3" placeholder="Brief description..."
					class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent resize-none"></textarea>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-300 mb-1">Start date *</label>
					<input bind:value={dateStart} type="datetime-local"
						class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-300 mb-1">End date</label>
					<input bind:value={dateEnd} type="datetime-local"
						class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent" />
				</div>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-300 mb-1">City *</label>
				<select bind:value={cityId} required
					class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent">
					<option value="">Select city...</option>
					{#each data.cities as city}
						<option value={city.id}>{city.name}{city.state ? `, ${city.state}` : ''} — {city.country}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-300 mb-1">Venue / Place</label>
				<input bind:value={venueName} type="text" placeholder="Big Grove Brewery"
					class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent" />
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-300 mb-1">Address</label>
				<input bind:value={venueAddress} type="text" placeholder="123 Main St, Cedar Rapids"
					class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent" />
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-300 mb-1">Type</label>
				<select bind:value={type}
					class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent">
					{#each EVENT_TYPES as t}
						<option value={t.id}>{t.label}</option>
					{/each}
				</select>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-300 mb-1">Price</label>
					<select bind:value={price}
						class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent">
						<option value="free">Free</option>
						<option value="paid">Paid</option>
					</select>
				</div>
				{#if price === 'paid'}
					<div>
						<label class="block text-sm font-medium text-gray-300 mb-1">Amount ($)</label>
						<input bind:value={priceAmount} type="number" min="0" step="0.01" placeholder="25"
							class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent" />
					</div>
				{/if}
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-300 mb-1">Event URL</label>
				<input bind:value={sourceUrl} type="url" placeholder="https://..."
					class="w-full bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent" />
			</div>

			<div class="border-t border-white/[0.06] pt-5">
				<p class="text-sm text-gray-500 mb-3">Your contact (optional — for follow-up)</p>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<input bind:value={submitterName} type="text" placeholder="Your name"
						class="bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent" />
					<input bind:value={submitterEmail} type="email" placeholder="your@email.com"
						class="bg-gendo-muted border border-white/[0.06] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gendo-accent" />
				</div>
			</div>

			<button type="submit" disabled={submitting}
				class="w-full bg-gendo-accent hover:bg-gendo-accent/90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
				{submitting ? 'Submitting...' : 'Submit Event'}
			</button>
		</form>
	</div>
</div>
