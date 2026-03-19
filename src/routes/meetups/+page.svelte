<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import { goto } from '$app/navigation';

	export let data: PageData;

	let meetups = data.meetups;
	let currentUser = data.currentUser;
	let city = data.city;

	// Auth modal
	let showAuthModal = false;
	let authUsername = '';
	let authDisplayName = '';
	let authCountry = '';
	let authTravelStyle = 'traveler';
	let authBio = '';
	let authLoading = false;
	let authError = '';

	// New meetup form
	let showNewMeetup = false;
	let newTitle = '';
	let newDescription = '';
	let newLocation = '';
	let newLocationAddress = '';
	let newDate = '';
	let newTime = '18:00';
	let newMaxPeople = 15;
	let newTags: string[] = [];
	let tagInput = '';
	let submitting = false;
	let formError = '';

	// ── Helpers ──────────────────────────────────────────────────────────
	const travelEmoji: Record<string, string> = { backpacker: '🎒', nomad: '💻', solo_traveler: '🧭', traveler: '✈️', local: '📍', expat: '🌍' };
	const travelLabel: Record<string, string> = { backpacker: 'Backpacker', nomad: 'Digital Nomad', solo_traveler: 'Solo Traveler', traveler: 'Traveler', local: 'Local', expat: 'Expat' };

	function timeAgo(ts: number) {
		const diff = Date.now() / 1000 - ts;
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	}

	function parseTags(tags: string): string[] {
		try { return JSON.parse(tags); } catch { return []; }
	}

	function addTag(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
			if (tag && !newTags.includes(tag) && newTags.length < 6) {
				newTags = [...newTags, tag];
			}
			tagInput = '';
		}
	}

	// ── Auth ──────────────────────────────────────────────────────────────
	async function joinAsViajero() {
		if (!authUsername.trim()) { authError = 'Username is required'; return; }
		authLoading = true; authError = '';
		try {
			const res = await fetch('/api/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: authUsername, displayName: authDisplayName || authUsername, homeCountry: authCountry, travelStyle: authTravelStyle, bio: authBio })
			});
			const d = await res.json();
			if (!res.ok) { authError = d.error ?? 'Error'; return; }
			currentUser = d.user;
			showAuthModal = false;
		} catch { authError = 'Network error'; } finally { authLoading = false; }
	}

	// ── Meetup actions ────────────────────────────────────────────────────
	async function joinMeetup(meetupId: number) {
		if (!currentUser) { showAuthModal = true; return; }
		const res = await fetch(`/api/meetups?action=join&id=${meetupId}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
		if (res.ok) {
			const d = await res.json();
			meetups = meetups.map((m: {id:number}) => m.id === meetupId ? { ...m, attendee_count: d.attendee_count, user_attending: true } : m);
		}
	}

	async function leaveMeetup(meetupId: number) {
		const res = await fetch(`/api/meetups?action=leave&id=${meetupId}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
		if (res.ok) {
			const d = await res.json();
			meetups = meetups.map((m: {id:number}) => m.id === meetupId ? { ...m, attendee_count: d.attendee_count, user_attending: false } : m);
		}
	}

	async function createMeetup() {
		if (!currentUser) { showAuthModal = true; return; }
		if (!newTitle.trim() || !newLocation.trim() || !newDate) { formError = 'Title, location, and date are required'; return; }
		submitting = true; formError = '';
		try {
			const dateStart = new Date(`${newDate}T${newTime}:00`).toISOString();
			const res = await fetch('/api/meetups', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newTitle, description: newDescription,
					locationName: newLocation, locationAddress: newLocationAddress,
					dateStart, maxPeople: newMaxPeople,
					tags: newTags,
					cityId: city?.id ?? null
				})
			});
			const d = await res.json();
			if (!res.ok) { formError = d.error ?? 'Error creating meetup'; return; }
			meetups = [d.meetup, ...meetups];
			showNewMeetup = false;
			newTitle = ''; newDescription = ''; newLocation = ''; newDate = ''; newTags = [];
		} catch { formError = 'Network error'; } finally { submitting = false; }
	}
</script>

<svelte:head>
	<title>{city ? `Meetups in ${city.name}` : 'Traveler Meetups'} — Gendo</title>
</svelte:head>

<div class="min-h-screen bg-gendo-bg text-white">

	<!-- Header -->
	<div class="bg-gradient-to-br from-gendo-surface via-gendo-muted to-gendo-bg py-10 px-4">
		<div class="max-w-5xl mx-auto">
			<a href="/" class="text-gendo-accent hover:text-white text-sm mb-4 inline-block">← Gendo</a>
			<div class="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 class="text-3xl font-bold text-white">
						🤝 Traveler Meetups
						{#if city} in {city.name}{/if}
					</h1>
					<p class="text-gendo-cream/80 mt-1">
						Connect with backpackers, nomads & solo travelers.
						{#if city}Meetups in {city.name}, {city.state ?? city.country}.
						{:else}Browse meetups worldwide or filter by city.
						{/if}
					</p>
				</div>
				<button
					on:click={() => { if (!currentUser) { showAuthModal = true; } else { showNewMeetup = !showNewMeetup; } }}
					class="bg-gendo-accent hover:bg-gendo-accent/90 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
				>
					+ Post a Meetup
				</button>
			</div>

			<!-- City filter tabs -->
			{#if data.popularCities.length > 0}
				<div class="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
					<a href="/meetups" class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm {!city ? 'bg-gendo-accent text-white font-medium' : 'bg-white/10 text-white/70 hover:bg-white/20'}">All</a>
					{#each data.popularCities as c}
						<a
							href="/meetups?city={encodeURIComponent(c.name)}"
							class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm whitespace-nowrap {city?.id === c.id ? 'bg-gendo-accent text-white font-medium' : 'bg-white/10 text-white/70 hover:bg-white/20'}"
						>
							{c.name}
							{#if c.meetup_count > 0}<span class="ml-1 opacity-60">({c.meetup_count})</span>{/if}
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

		<!-- New Meetup Form -->
		{#if showNewMeetup && currentUser}
			<div class="bg-gendo-surface border border-gendo-accent/30 rounded-2xl p-6 mb-8">
				<h2 class="font-bold text-white text-lg mb-4">✨ Create a Meetup</h2>

				{#if formError}
					<p class="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 mb-4">{formError}</p>
				{/if}

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="sm:col-span-2">
						<label class="text-xs text-gray-400 mb-1 block">Meetup Title *</label>
						<input bind:value={newTitle} placeholder="Beach hangout at Playa Norte, looking for travelers!" maxlength="100"
							class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" />
					</div>
					<div class="sm:col-span-2">
						<label class="text-xs text-gray-400 mb-1 block">Description</label>
						<textarea bind:value={newDescription} placeholder="I'll be at the north end of the beach around sunset. Looking for people to share a beer and explore the town. All nationalities welcome!" maxlength="500" rows="3"
							class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted"></textarea>
					</div>
					<div>
						<label class="text-xs text-gray-400 mb-1 block">Location Name * <span class="text-gray-600">(hostel, beach, bar...)</span></label>
						<input bind:value={newLocation} placeholder="Hostal Mundo Libre / Main Beach" maxlength="100"
							class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" />
					</div>
					<div>
						<label class="text-xs text-gray-400 mb-1 block">Address <span class="text-gray-600">(optional)</span></label>
						<input bind:value={newLocationAddress} placeholder="123 Beach Rd, Cedar Rapids" maxlength="200"
							class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" />
					</div>
					<div>
						<label class="text-xs text-gray-400 mb-1 block">Date *</label>
						<input bind:value={newDate} type="date" min={new Date().toISOString().split('T')[0]}
							class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent" />
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="text-xs text-gray-400 mb-1 block">Time</label>
							<input bind:value={newTime} type="time"
								class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent" />
						</div>
						<div>
							<label class="text-xs text-gray-400 mb-1 block">Max People</label>
							<input bind:value={newMaxPeople} type="number" min="2" max="200"
								class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent" />
						</div>
					</div>
					<div class="sm:col-span-2">
						<label class="text-xs text-gray-400 mb-1 block">Tags <span class="text-gray-600">(press Enter to add)</span></label>
						<div class="flex flex-wrap gap-1.5 mb-2">
							{#each newTags as tag}
								<span class="bg-gendo-accent/15 text-gendo-accent px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
									#{tag}
									<button on:click={() => newTags = newTags.filter(t => t !== tag)} class="text-gendo-accent hover:text-white">×</button>
								</span>
							{/each}
						</div>
						<input bind:value={tagInput} on:keydown={addTag} placeholder="beach, hiking, backpacker, music..." maxlength="30"
							class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" />
					</div>
				</div>

				<div class="flex gap-3 mt-5">
					<button on:click={createMeetup} disabled={submitting} class="bg-gendo-accent hover:bg-gendo-accent/90 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
						{submitting ? 'Creating...' : '🚀 Create Meetup'}
					</button>
					<button on:click={() => { showNewMeetup = false; formError = ''; }} class="text-gray-400 hover:text-white px-4 py-2.5 transition-colors">
						Cancel
					</button>
				</div>
			</div>
		{/if}

		<!-- Meetups list -->
		{#if meetups.length === 0}
			<div class="text-center py-16">
				<p class="text-4xl mb-3">🏝️</p>
				<p class="text-xl text-white mb-2">No meetups yet{city ? ` in ${city.name}` : ''}</p>
				<p class="text-gray-400 mb-5">Be the first! Post a meetup and connect with other travelers.</p>
				<button on:click={() => { if (!currentUser) { showAuthModal = true; } else { showNewMeetup = true; } }}
					class="bg-gendo-accent hover:bg-gendo-accent/90 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
					Post the First Meetup
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each meetups as meetup (meetup.id)}
					<div class="bg-gendo-surface border border-white/[0.06] hover:border-gendo-accent/40 rounded-2xl p-5 transition-colors">
						<!-- Header: organizer -->
						<div class="flex items-center gap-2 mb-3">
							<img src={meetup.avatar_url ?? `https://ui-avatars.com/api/?name=${meetup.username}&background=random&color=fff&size=64`}
								alt={meetup.username} class="w-8 h-8 rounded-full" />
							<div>
								<span class="text-white text-sm font-medium">{meetup.display_name ?? meetup.username}</span>
								<span class="text-xs text-gray-500 ml-1">{travelEmoji[meetup.travel_style] ?? '✈️'} {travelLabel[meetup.travel_style] ?? 'Traveler'}</span>
								{#if meetup.home_country}<span class="text-xs text-gray-500"> · {meetup.home_country}</span>{/if}
							</div>
							<span class="ml-auto text-xs text-gray-600">{timeAgo(meetup.created_at)}</span>
						</div>

						<h3 class="font-semibold text-white text-base leading-snug mb-1">{meetup.title}</h3>
						{#if meetup.description}
							<p class="text-gray-400 text-sm line-clamp-2 mb-3">{meetup.description}</p>
						{/if}

						<!-- Location + Date -->
						<div class="space-y-1 mb-3">
							<div class="flex items-center gap-1.5 text-sm text-gray-300">
								<span>📍</span>
								<span class="font-medium">{meetup.location_name}</span>
							</div>
							{#if meetup.location_address}
								<p class="text-xs text-gray-500 pl-5">{meetup.location_address}</p>
							{/if}
							<div class="flex items-center gap-1.5 text-sm text-gray-300">
								<span>📅</span>
								<span>{format(new Date(meetup.date_start * 1000), 'EEE, MMM d · h:mm a')}</span>
							</div>
							<div class="flex items-center gap-1.5 text-sm">
								<span>👥</span>
								<span class="{meetup.attendee_count >= meetup.max_people ? 'text-red-400' : 'text-gray-300'}">
									{meetup.attendee_count} / {meetup.max_people}
									{meetup.attendee_count >= meetup.max_people ? ' (Full)' : ' going'}
								</span>
							</div>
						</div>

						<!-- Tags -->
						{#if parseTags(meetup.tags).length > 0}
							<div class="flex flex-wrap gap-1 mb-3">
								{#each parseTags(meetup.tags) as tag}
									<span class="text-xs bg-gendo-accent/15 text-gendo-accent px-2 py-0.5 rounded-full">#{tag}</span>
								{/each}
							</div>
						{/if}

						<!-- Join/Leave button -->
						{#if meetup.user_attending}
							<button on:click={() => leaveMeetup(meetup.id)}
								class="w-full py-2 rounded-xl text-sm font-medium bg-green-500/20 text-green-300 border border-green-600/40 hover:bg-red-900/30 hover:text-red-300 hover:border-red-600/40 transition-all">
								✅ You're going · Leave
							</button>
						{:else if meetup.attendee_count >= meetup.max_people || meetup.status === 'full'}
							<button disabled class="w-full py-2 rounded-xl text-sm font-medium bg-gendo-muted text-gendo-text-muted border border-white/[0.06] cursor-not-allowed">
								🔒 Full
							</button>
						{:else}
							<button on:click={() => joinMeetup(meetup.id)}
								class="w-full py-2 rounded-xl text-sm font-medium bg-gendo-accent/20 text-gendo-accent border border-gendo-accent/40 hover:bg-gendo-accent hover:text-white hover:border-gendo-accent transition-all">
								🤝 Join Meetup
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Auth Modal -->
{#if showAuthModal}
	<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" on:click|self={() => showAuthModal = false}>
		<div class="bg-gendo-surface border border-white/[0.06] rounded-2xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-white mb-1">✈️ Create Your Traveler Profile</h2>
			<p class="text-gray-400 text-sm mb-5">No email needed. Just pick a username and explore.</p>
			{#if authError}
				<p class="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 mb-4">{authError}</p>
			{/if}
			<div class="space-y-3">
				<input bind:value={authUsername} type="text" placeholder="Username (e.g. nomad_jane) *" maxlength="30"
					class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" />
				<input bind:value={authDisplayName} type="text" placeholder="Display Name" maxlength="50"
					class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" />
				<div class="grid grid-cols-2 gap-3">
					<input bind:value={authCountry} type="text" placeholder="Home Country" maxlength="50"
						class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" />
					<select bind:value={authTravelStyle} class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gendo-accent">
						<option value="traveler">✈️ Traveler</option>
						<option value="backpacker">🎒 Backpacker</option>
						<option value="nomad">💻 Digital Nomad</option>
						<option value="solo_traveler">🧭 Solo Traveler</option>
						<option value="local">📍 Local</option>
						<option value="expat">🌍 Expat</option>
					</select>
				</div>
				<textarea bind:value={authBio} placeholder="Brief bio... (optional)" maxlength="300" rows="2"
					class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted"></textarea>
			</div>
			<button on:click={joinAsViajero} disabled={authLoading}
				class="mt-4 w-full bg-gendo-accent hover:bg-gendo-accent/90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
				{authLoading ? 'Creating...' : '🚀 Create Profile & Continue'}
			</button>
			<button on:click={() => showAuthModal = false} class="mt-2 w-full text-gray-500 hover:text-white text-sm py-2 transition-colors">Cancel</button>
		</div>
	</div>
{/if}
