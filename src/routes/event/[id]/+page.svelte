<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import { onMount } from 'svelte';
	import { cleanVenueName, cleanEventTitle } from '$lib/cleanNames';
	import { formatEventCity } from '$lib/formatCity';
	import { getUserLang, translateText } from '$lib/translate';

	export let data: PageData;

	const { event, related } = data;

	// ── Reactive state ─────────────────────────────────────────────────────
	let comments = data.comments;
	let rsvp = data.rsvp;
	let userRsvpStatus = data.userRsvpStatus;
	let currentUser = data.currentUser;

	// Auth modal
	let showAuthModal = false;
	let authUsername = '';
	let authDisplayName = '';
	let authCountry = '';
	let authTravelStyle = 'traveler';
	let authBio = '';
	let authLoading = false;
	let authError = '';

	// Comments
	let newComment = '';
	let replyingTo: number | null = null;
	let replyContent = '';
	let submittingComment = false;

	// ── Helpers ─────────────────────────────────────────────────────────────
	const typeEmoji: Record<string, string> = { live_music: '🎵', theater: '🎭', sports: '🏟️', comedy: '😂', festival: '🎪', food: '🍽️', art: '🎨', cinema: '🎬', other: '📅' };
	const travelEmoji: Record<string, string> = { backpacker: '🎒', nomad: '💻', solo_traveler: '🧭', traveler: '✈️', local: '📍', expat: '🌍' };

	function formatDate(ms: number) {
		return format(new Date(ms), "EEEE, MMMM d, yyyy 'at' h:mm a");
	}
	function timeAgo(ts: number) {
		const diff = Date.now() / 1000 - ts;
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	}

	function openDirections() {
		const dest = [event.venueAddress, event.venueName, event.cityName].filter(Boolean).join(', ') || '';
		const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
		let url: string;
		if (event.venueLat != null && event.venueLng != null) {
			url = isIOS
				? `https://maps.apple.com/?daddr=${event.venueLat},${event.venueLng}`
				: `https://www.google.com/maps/dir/?api=1&destination=${event.venueLat},${event.venueLng}`;
		} else {
			url = isIOS
				? `https://maps.apple.com/?q=${encodeURIComponent(dest)}`
				: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`;
		}
		window.open(url, '_blank', 'noopener');
	}
	function parseTags(tags: string | null): string[] {
		if (!tags) return [];
		try { return JSON.parse(tags).slice(0, 6); } catch { return []; }
	}
	function goingCount() {
		return rsvp.counts.find((c: {status:string;count:number}) => c.status === 'going')?.count ?? 0;
	}
	function interestedCount() {
		return rsvp.counts.find((c: {status:string;count:number}) => c.status === 'interested')?.count ?? 0;
	}

	// ── Auth ──────────────────────────────────────────────────────────────
	async function joinAsViajero() {
		if (!authUsername.trim()) { authError = 'Username is required'; return; }
		authLoading = true; authError = '';
		try {
			const res = await fetch('/api/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: authUsername,
					displayName: authDisplayName || authUsername,
					homeCountry: authCountry,
					travelStyle: authTravelStyle,
					bio: authBio
				})
			});
			const data = await res.json();
			if (!res.ok) { authError = data.error ?? 'Error creating profile'; return; }
			currentUser = data.user;
			showAuthModal = false;
		} catch { authError = 'Network error'; } finally { authLoading = false; }
	}

	// ── RSVP ──────────────────────────────────────────────────────────────
	async function setRsvp(status: string) {
		if (!currentUser) { showAuthModal = true; return; }
		const newStatus = userRsvpStatus === status ? 'not_going' : status;
		const res = await fetch('/api/rsvp', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ eventId: event.id, status: newStatus })
		});
		if (res.ok) {
			const d = await res.json();
			rsvp = { counts: d.counts, attendees: d.attendees };
			userRsvpStatus = d.userStatus;
		}
	}

	// ── Comments ──────────────────────────────────────────────────────────
	async function postComment(parentId?: number) {
		if (!currentUser) { showAuthModal = true; return; }
		const content = parentId ? replyContent : newComment;
		if (!content.trim()) return;
		submittingComment = true;
		try {
			const res = await fetch('/api/comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eventId: event.id, content, parentId: parentId ?? null })
			});
			if (res.ok) {
				const d = await res.json();
				if (parentId) {
					comments = comments.map((c: {id:number;replies?:unknown[]}) =>
						c.id === parentId ? { ...c, replies: [...(c.replies ?? []), d.comment] } : c
					);
					replyContent = ''; replyingTo = null;
				} else {
					comments = [...comments, { ...d.comment, replies: [] }];
					newComment = '';
				}
			}
		} finally { submittingComment = false; }
	}

	async function likeComment(commentId: number) {
		if (!currentUser) { showAuthModal = true; return; }
		const res = await fetch(`/api/comments?action=like&id=${commentId}`, { method: 'POST' });
		if (res.ok) {
			const d = await res.json();
			function updateLike(list: unknown[]): unknown[] {
				return list.map((c: unknown) => {
					const comment = c as {id:number;likes:number;user_liked:boolean;replies?:unknown[]};
					if (comment.id === commentId) return { ...comment, likes: d.likes, user_liked: d.liked };
					if (comment.replies) return { ...comment, replies: updateLike(comment.replies) };
					return comment;
				});
			}
			comments = updateLike(comments);
		}
	}

	// ── Traducción según idioma del dispositivo ────────────────────────────
	let userLang = 'en' as 'es' | 'en';
	let translatedTitle = '';
	let translatedDesc = '';
	$: if (typeof window !== 'undefined') userLang = getUserLang();
	$: if (event && userLang) {
		translateText(cleanEventTitle(event.title, event.cityName), userLang).then((t) => { translatedTitle = t; });
		if (event.description) translateText(event.description.slice(0, 500), userLang).then((t) => { translatedDesc = t; });
	}

	// ── Save to agenda ────────────────────────────────────────────────────
	const SAVED_KEY = 'gendo_saved_ids';
	let isSaved = false;
	let saving = false;

	async function toggleSave() {
		if (saving) return;
		saving = true;
		try {
			if (currentUser) {
				if (isSaved) {
					await fetch('/api/saved-events', {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ eventId: event.id }),
					});
				} else {
					await fetch('/api/saved-events', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ eventId: event.id }),
					});
				}
			} else {
				try {
					const raw = localStorage.getItem(SAVED_KEY);
					const ids: number[] = raw ? JSON.parse(raw) : [];
					if (isSaved) {
						localStorage.setItem(SAVED_KEY, JSON.stringify(ids.filter((x) => x !== event.id)));
					} else {
						if (!ids.includes(event.id)) ids.push(event.id);
						localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
					}
				} catch {}
			}
			isSaved = !isSaved;
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		if (currentUser) {
			const res = await fetch('/api/saved-events');
			const d = await res.json();
			isSaved = d.eventIds?.includes(event.id) ?? false;
		} else {
			try {
				const raw = localStorage.getItem(SAVED_KEY);
				const ids: number[] = raw ? JSON.parse(raw) : [];
				isSaved = ids.includes(event.id);
			} catch {}
		}
	});
</script>

<svelte:head>
	<title>{event.title} — Gendo</title>
</svelte:head>

<div class="min-h-screen bg-gendo-bg text-white">

	<!-- Back nav -->
	<div class="bg-gendo-surface border-b border-white/[0.06] px-4 py-3">
		<div class="max-w-4xl mx-auto flex items-center gap-3">
			{#if event.cityName}
				<a href="/city/{event.cityName.toLowerCase().replace(/\s+/g,'-')}" class="text-gendo-accent hover:text-gendo-accent/80 text-sm">
					← {formatEventCity({ cityName: event.cityName, cityState: event.state, cityCountry: event.country })}
				</a>
			{:else}
				<a href="/" class="text-gendo-accent hover:text-gendo-accent/80 text-sm">← Back</a>
			{/if}
		</div>
	</div>

	<div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

			<!-- Main content (2/3) -->
			<div class="lg:col-span-2 space-y-6">

				<!-- Event header -->
				<div class="bg-gendo-surface rounded-2xl p-4 sm:p-6 border border-white/[0.06]">
					<div class="flex items-start gap-3">
						<span class="text-3xl sm:text-4xl flex-shrink-0">{typeEmoji[event.type] ?? '📅'}</span>
						<div class="flex-1 min-w-0">
							{#if event.featured}
								<span class="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full mb-2 inline-block">⭐ Featured</span>
							{/if}
							<h1 class="text-xl sm:text-2xl font-bold text-white break-words">{translatedTitle || cleanEventTitle(event.title, event.cityName)}</h1>
							<p class="text-gendo-accent mt-1">{formatDate(event.dateStart)}</p>
							{#if event.venueName}
								<button
									on:click={openDirections}
									class="text-gray-400 mt-1 hover:text-gendo-accent transition-colors text-left"
									title="Abrir en mapa"
								>📍 {cleanVenueName(event.venueName, event.cityName)}{event.venueAddress ? ` — ${event.venueAddress}` : ''}</button>
							{/if}
						</div>
					</div>

					{#if event.description}
						<p class="mt-4 text-gray-300 leading-relaxed">{translatedDesc || event.description}</p>
					{/if}

					<!-- Price + links — touch-friendly -->
					<div class="flex flex-wrap gap-2 sm:gap-3 mt-4 items-center">
						<button
							on:click={toggleSave}
							disabled={saving}
							class="flex items-center gap-1.5 px-4 py-2.5 sm:py-1.5 rounded-full text-sm font-medium transition-colors min-h-[44px] sm:min-h-0
								{isSaved ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-gendo-muted text-gendo-cream/80 hover:bg-gendo-muted/80 border border-white/[0.06]'}"
							title={isSaved ? 'Remove from agenda' : 'Add to my agenda'}>
							{isSaved ? '📌 Saved' : '📌 Save'}
						</button>
						{#if event.price === 'free'}
							<span class="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">FREE</span>
						{:else if event.priceAmount}
							<span class="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-medium">${event.priceAmount} {event.currency ?? 'USD'}</span>
						{:else if event.price === 'paid'}
							<span class="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-medium">Paid</span>
						{/if}
						{#if event.sourceUrl}
							<a href={event.sourceUrl} target="_blank" rel="noopener" class="bg-gendo-accent hover:bg-gendo-accent/90 text-white px-4 py-1.5 rounded-full text-sm transition-colors">
								Get Tickets / Info →
							</a>
						{/if}
						{#if event.venueWebsite}
							<a href={event.venueWebsite} target="_blank" rel="noopener" class="text-gray-400 hover:text-white text-sm">
								Venue website →
							</a>
						{/if}
					</div>

					<!-- Tags -->
					{#if parseTags(event.tags).length > 0}
						<div class="flex flex-wrap gap-1 mt-3">
							{#each parseTags(event.tags) as tag}
								<span class="text-xs bg-gendo-accent/15 text-gendo-accent px-2 py-0.5 rounded-full">#{tag}</span>
							{/each}
						</div>
					{/if}
				</div>

				<!-- RSVP Section -->
				<div class="bg-gendo-surface rounded-2xl p-6 border border-white/[0.06]">
					<h2 class="font-semibold text-white mb-4">Are you going?</h2>

					<div class="flex gap-3 mb-4">
						<button
							on:click={() => setRsvp('going')}
							class="flex-1 py-2.5 rounded-xl font-medium text-sm transition-all {userRsvpStatus === 'going'
								? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
								: 'bg-gendo-muted text-gendo-cream/80 hover:bg-green-900/50 hover:text-green-300 border border-white/[0.06]'}"
						>
							✅ Going ({goingCount()})
						</button>
						<button
							on:click={() => setRsvp('interested')}
							class="flex-1 py-2.5 rounded-xl font-medium text-sm transition-all {userRsvpStatus === 'interested'
								? 'bg-yellow-500 text-gendo-bg shadow-lg'
								: 'bg-gendo-muted text-gendo-cream/80 hover:bg-yellow-900/50 hover:text-yellow-300 border border-white/[0.06]'}"
						>
							⭐ Interested ({interestedCount()})
						</button>
					</div>

					<!-- Attendees -->
					{#if rsvp.attendees.length > 0}
						<div>
							<p class="text-sm text-gray-400 mb-2">Who's going:</p>
							<div class="flex flex-wrap gap-2">
								{#each rsvp.attendees as att}
									<div class="flex items-center gap-1.5 bg-gendo-muted rounded-full px-3 py-1" title="{att.home_country ? `From ${att.home_country}` : ''}">
										{#if att.avatar_url}
											<img src={att.avatar_url} alt={att.username} class="w-5 h-5 rounded-full" />
										{/if}
										<span class="text-xs text-white">{att.display_name ?? att.username}</span>
										<span class="text-xs">{travelEmoji[att.travel_style] ?? '✈️'}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Comments Section -->
				<div class="bg-gendo-surface rounded-2xl p-6 border border-white/[0.06]">
					<h2 class="font-semibold text-white mb-4">
						💬 Discussion ({comments.length} {comments.length === 1 ? 'comment' : 'comments'})
					</h2>

					<!-- New comment box -->
					{#if currentUser}
						<div class="flex gap-3 mb-6">
							<img src={currentUser.avatarUrl ?? `https://ui-avatars.com/api/?name=${currentUser.username}&background=random&color=fff&size=64`} alt={currentUser.username} class="w-9 h-9 rounded-full flex-shrink-0" />
							<div class="flex-1">
								<textarea
									bind:value={newComment}
									placeholder="Share your thoughts, tips, or questions about this event..."
									class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted"
									rows="3"
								></textarea>
								<button
									on:click={() => postComment()}
									disabled={submittingComment || !newComment.trim()}
									class="mt-2 bg-gendo-accent hover:bg-gendo-accent/90 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
								>
									{submittingComment ? 'Posting...' : 'Post Comment'}
								</button>
							</div>
						</div>
					{:else}
						<button
							on:click={() => showAuthModal = true}
							class="w-full bg-gendo-muted hover:bg-gendo-muted/80 border border-white/[0.06] border-dashed text-gendo-text-muted hover:text-white rounded-xl py-4 text-sm transition-colors mb-6"
						>
							✈️ Join as a traveler to comment...
						</button>
					{/if}

					<!-- Comments list -->
					{#if comments.length === 0}
						<p class="text-gray-500 text-sm text-center py-4">No comments yet. Be the first!</p>
					{/if}

					<div class="space-y-4">
						{#each comments as comment (comment.id)}
							<div class="flex gap-3">
								<img src={comment.avatar_url ?? `https://ui-avatars.com/api/?name=${comment.username}&background=random&color=fff&size=64`} alt={comment.username} class="w-8 h-8 rounded-full flex-shrink-0 mt-1" />
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<span class="font-medium text-white text-sm">{comment.display_name ?? comment.username}</span>
										<span class="text-xs text-gray-500">{travelEmoji[comment.travel_style] ?? '✈️'}</span>
										<span class="text-xs text-gray-500">{timeAgo(comment.created_at)}</span>
									</div>
									<p class="text-gray-300 text-sm mt-1 leading-relaxed">{comment.content}</p>
									<div class="flex gap-3 mt-1">
										<button on:click={() => likeComment(comment.id)} class="text-xs {comment.user_liked ? 'text-pink-400' : 'text-gray-500 hover:text-pink-400'} transition-colors">
											♥ {comment.likes > 0 ? comment.likes : ''}
										</button>
										{#if currentUser}
											<button on:click={() => { replyingTo = replyingTo === comment.id ? null : comment.id; }} class="text-xs text-gendo-text-muted hover:text-gendo-accent transition-colors">
												Reply
											</button>
										{/if}
									</div>

									<!-- Reply box -->
									{#if replyingTo === comment.id}
										<div class="mt-3 flex gap-2">
											<textarea
												bind:value={replyContent}
												placeholder="Write a reply..."
												class="flex-1 bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted"
												rows="2"
											></textarea>
											<div class="flex flex-col gap-1">
												<button on:click={() => postComment(comment.id)} disabled={!replyContent.trim()} class="bg-gendo-accent hover:bg-gendo-accent/90 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs">Reply</button>
												<button on:click={() => { replyingTo = null; replyContent = ''; }} class="text-gray-500 hover:text-white text-xs px-3 py-1.5">Cancel</button>
											</div>
										</div>
									{/if}

									<!-- Nested replies -->
									{#if comment.replies && comment.replies.length > 0}
										<div class="mt-3 pl-4 border-l border-white/[0.06] space-y-3">
											{#each comment.replies as reply (reply.id)}
												<div class="flex gap-2">
													<img src={reply.avatar_url ?? `https://ui-avatars.com/api/?name=${reply.username}&background=random&color=fff&size=64`} alt={reply.username} class="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
													<div>
														<div class="flex items-center gap-2">
															<span class="font-medium text-white text-xs">{reply.display_name ?? reply.username}</span>
															<span class="text-xs text-gray-500">{travelEmoji[reply.travel_style] ?? '✈️'}</span>
															<span class="text-xs text-gray-500">{timeAgo(reply.created_at)}</span>
														</div>
														<p class="text-gray-300 text-sm leading-relaxed">{reply.content}</p>
														<button on:click={() => likeComment(reply.id)} class="text-xs {reply.user_liked ? 'text-pink-400' : 'text-gray-500 hover:text-pink-400'} mt-0.5 transition-colors">
															♥ {reply.likes > 0 ? reply.likes : ''}
														</button>
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Sidebar (1/3) -->
			<div class="space-y-4">

				<!-- Venue info -->
				{#if event.venueName}
					<div class="bg-gendo-surface rounded-xl p-4 border border-white/[0.06]">
						<h3 class="font-semibold text-white mb-2 text-sm">📍 Venue</h3>
						<button
							on:click={openDirections}
							class="text-white font-medium hover:text-gendo-accent transition-colors text-left block"
							title="Abrir en mapa"
						>{cleanVenueName(event.venueName, event.cityName)}</button>
						{#if event.venueAddress}
							<button
								on:click={openDirections}
								class="text-gray-400 text-xs mt-0.5 hover:text-gendo-accent transition-colors text-left block"
								title="Abrir en mapa"
							>{event.venueAddress}</button>
						{/if}
						{#if event.venueDesc}<p class="text-gray-400 text-xs mt-2">{event.venueDesc}</p>{/if}
						<div class="flex flex-wrap gap-3 mt-2">
							<button
								on:click={openDirections}
								class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gendo-accent hover:bg-gendo-accent/90 text-white text-sm font-medium transition-colors"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
								Cómo llegar
							</button>
							{#if event.venueWebsite}
								<a href={event.venueWebsite} target="_blank" rel="noopener" class="text-xs text-gendo-accent hover:text-gendo-accent/80 py-2">Website →</a>
							{/if}
							{#if event.venueInstagram}
								<a href="https://instagram.com/{event.venueInstagram}" target="_blank" rel="noopener" class="text-xs text-pink-400 hover:text-pink-300 py-2">@{event.venueInstagram}</a>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Your profile / Join CTA -->
				{#if !currentUser}
					<div class="bg-gradient-to-br from-gendo-surface to-gendo-muted rounded-xl p-4 border border-gendo-accent/30">
						<h3 class="font-semibold text-white mb-1">✈️ Join as a Traveler</h3>
						<p class="text-gendo-cream/80 text-xs mb-3">Say you're going, leave a comment, meet other travelers.</p>
						<button on:click={() => showAuthModal = true} class="w-full bg-gendo-accent text-white font-semibold py-2 rounded-lg text-sm hover:bg-gendo-accent/90 transition-colors">
							Create Free Profile
						</button>
					</div>
				{:else}
					<div class="bg-gendo-surface rounded-xl p-4 border border-white/[0.06] flex items-center gap-3">
						<img src={currentUser.avatarUrl ?? `https://ui-avatars.com/api/?name=${currentUser.username}&background=random&color=fff&size=64`} alt={currentUser.username} class="w-10 h-10 rounded-full" />
						<div>
							<p class="text-white font-medium text-sm">{currentUser.displayName ?? currentUser.username}</p>
							<p class="text-gray-400 text-xs">{travelEmoji[currentUser.travelStyle] ?? '✈️'} {currentUser.travelStyle}</p>
						</div>
					</div>
				{/if}

				<!-- Related events -->
				{#if related.length > 0}
					<div class="bg-gendo-surface rounded-xl p-4 border border-white/[0.06]">
						<h3 class="font-semibold text-white mb-3 text-sm">More like this</h3>
						<div class="space-y-2">
							{#each related as rel (rel.id)}
								<a href="/event/{rel.id}" class="block hover:bg-gendo-muted rounded-lg p-2 -mx-2 transition-colors">
									<p class="text-white text-sm font-medium line-clamp-1">{cleanEventTitle(rel.title, event.cityName)}</p>
									<p class="text-gray-400 text-xs mt-0.5">
										{format(new Date(rel.dateStart), 'MMM d')}
										{#if rel.venueName} · {cleanVenueName(rel.venueName, event.cityName).slice(0, 25)}{/if}
									</p>
								</a>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Meetups CTA -->
				<div class="bg-gendo-surface rounded-xl p-4 border border-white/[0.06]">
					<h3 class="font-semibold text-white mb-1 text-sm">🤝 Traveler Meetups</h3>
					<p class="text-gray-400 text-xs mb-3">Meet other travelers in {formatEventCity({ cityName: event.cityName, cityState: event.state, cityCountry: event.country }) || 'this city'}. Post your own meetup or join one.</p>
					{#if event.cityName}
						<a href="/meetups?city={encodeURIComponent(event.cityName ?? '')}" class="block text-center bg-gendo-accent/20 hover:bg-gendo-accent/30 text-gendo-accent py-2 rounded-lg text-xs transition-colors">
							See Meetups in {formatEventCity({ cityName: event.cityName, cityState: event.state, cityCountry: event.country })} →
						</a>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Auth Modal -->
{#if showAuthModal}
	<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" on:click|self={() => showAuthModal = false}>
		<div class="bg-gendo-surface border border-white/[0.06] rounded-2xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-white mb-1">✈️ Create Your Traveler Profile</h2>
			<p class="text-gray-400 text-sm mb-5">No email needed. Just pick a username and go.</p>

			{#if authError}
				<p class="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 mb-4">{authError}</p>
			{/if}

			<div class="space-y-3">
				<div>
					<label class="text-xs text-gray-400 mb-1 block">Username *</label>
					<input bind:value={authUsername} type="text" placeholder="nomad_jane" maxlength="30"
						class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" />
				</div>
				<div>
					<label class="text-xs text-gray-400 mb-1 block">Display Name</label>
					<input bind:value={authDisplayName} type="text" placeholder="Jane" maxlength="50"
						class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="text-xs text-gray-400 mb-1 block">Home Country</label>
						<input bind:value={authCountry} type="text" placeholder="Mexico" maxlength="50"
							class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" />
					</div>
					<div>
						<label class="text-xs text-gray-400 mb-1 block">Travel Style</label>
						<select bind:value={authTravelStyle} class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gendo-accent">
							<option value="traveler">✈️ Traveler</option>
							<option value="backpacker">🎒 Backpacker</option>
							<option value="nomad">💻 Digital Nomad</option>
							<option value="solo_traveler">🧭 Solo Traveler</option>
							<option value="local">📍 Local</option>
							<option value="expat">🌍 Expat</option>
						</select>
					</div>
				</div>
				<div>
					<label class="text-xs text-gray-400 mb-1 block">Bio (optional)</label>
					<textarea bind:value={authBio} placeholder="Traveling through Iowa this week, love live music..." maxlength="300"
						class="w-full bg-gendo-muted border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-gendo-accent placeholder-gendo-text-muted" rows="2"></textarea>
				</div>
			</div>

			<button on:click={joinAsViajero} disabled={authLoading}
				class="mt-4 w-full bg-gendo-accent hover:bg-gendo-accent/90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
				{authLoading ? 'Creating...' : '🚀 Create Profile & Continue'}
			</button>
			<button on:click={() => showAuthModal = false} class="mt-2 w-full text-gray-500 hover:text-white text-sm py-2 transition-colors">
				Cancel
			</button>
		</div>
	</div>
{/if}
