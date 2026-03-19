<script lang="ts">
	/**
	 * JoinModal — Modal de registro para Gendo.
	 * Diseño acogedor, sin email, pensado para viajeros.
	 */
	import { createEventDispatcher } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	export let open = false;

	let loading = false;
	let error = '';

	export let username = '';
	export let displayName = '';
	export let homeCountry = '';
	export let travelStyle = 'traveler';
	export let bio = '';

	const dispatch = createEventDispatcher<{ close: void; success: { user: unknown } }>();

	// Resetear estado al abrir
	$: if (open) {
		error = '';
	}

	const TRAVEL_OPTIONS = [
		{ id: 'traveler', emoji: '✈️', label: 'Viajero' },
		{ id: 'backpacker', emoji: '🎒', label: 'Mochilero' },
		{ id: 'nomad', emoji: '💻', label: 'Nómada digital' },
		{ id: 'solo_traveler', emoji: '🧭', label: 'Solo traveler' },
		{ id: 'local', emoji: '📍', label: 'Local' },
		{ id: 'expat', emoji: '🌍', label: 'Expatriado' },
	];

	async function handleSubmit() {
		if (!username.trim()) {
			error = 'El username es obligatorio';
			return;
		}
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
					displayName: (displayName || username).trim().slice(0, 50),
					homeCountry: homeCountry.trim().slice(0, 50),
					travelStyle,
					bio: bio.trim().slice(0, 300),
				}),
			});
			const d = await res.json();
			if (!res.ok) {
				error = d.error ?? 'Error al crear la cuenta';
				return;
			}
			dispatch('success', { user: d.user });
			open = false;
		} catch {
			error = 'Error de conexión. Intenta de nuevo.';
		} finally {
			loading = false;
		}
	}

	function close() {
		if (!loading) {
			open = false;
			dispatch('close');
		}
	}
</script>

{#if open}
	<!-- Overlay con gradiente cálido -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
		role="dialog"
		aria-modal="true"
		aria-labelledby="join-title"
	>
		<!-- Backdrop con blur -->
		<button
			aria-label="Cerrar"
			on:click={close}
			class="fixed inset-0 bg-black/70 backdrop-blur-md"
			transition:fade={{ duration: 200 }}
		/>

		<!-- Orbes decorativos -->
		<div class="fixed inset-0 pointer-events-none overflow-hidden">
			<div class="absolute -top-1/2 -left-1/4 w-[500px] h-[500px] bg-gendo-accent/15 rounded-full blur-[100px]"></div>
			<div class="absolute -bottom-1/3 -right-1/4 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[80px]"></div>
		</div>

		<!-- Card principal -->
		<div
			class="relative w-full max-w-md"
			transition:fly={{ y: 24, duration: 400, easing: quintOut }}
			on:click|stopPropagation
		>
			<div class="bg-gradient-to-b from-gendo-surface to-gendo-bg/95 border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
				<!-- Header con gradiente sutil -->
				<div class="relative px-6 pt-8 pb-6 border-b border-white/[0.06]">
					<div class="absolute inset-0 bg-gradient-to-br from-gendo-accent/5 via-transparent to-transparent pointer-events-none" aria-hidden="true"></div>
					<div class="relative flex items-start justify-between gap-4">
						<div>
							<span class="inline-flex items-center gap-1.5 text-xs text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full mb-3">
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
								Sin email · Gratis
							</span>
							<h2 id="join-title" class="text-2xl font-bold text-white tracking-tight">
								Únete a Gendo
							</h2>
							<p class="text-gray-400 text-sm mt-1.5 leading-relaxed">
								Guarda eventos, únete a meetups y descubre planes personalizados.
							</p>
						</div>
						<button
							on:click={close}
							disabled={loading}
							class="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
							aria-label="Cerrar"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>

				<!-- Form -->
				<form on:submit|preventDefault={handleSubmit} class="px-6 py-6 space-y-5">
					{#if error}
						<div
							class="flex items-center gap-2 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3"
							transition:fade={{ duration: 200 }}
						>
							<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span>{error}</span>
						</div>
					{/if}

					<div>
						<label for="join-username" class="block text-xs font-medium text-gray-400 mb-1.5">Username *</label>
						<div class="relative">
							<span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-base">@</span>
							<input
								id="join-username"
								type="text"
								bind:value={username}
								placeholder="tu_nombre"
								maxlength="30"
								autocomplete="username"
								class="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl pl-9 pr-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-gendo-accent/50 focus:ring-1 focus:ring-gendo-accent/30 transition-all"
							/>
						</div>
						<p class="text-xs text-gray-600 mt-1">Letras, números, puntos y guiones bajos.</p>
					</div>

					<div>
						<label for="join-display" class="block text-xs font-medium text-gray-400 mb-1.5">Nombre para mostrar</label>
						<input
							id="join-display"
							type="text"
							bind:value={displayName}
							placeholder="Tu nombre o apodo"
							maxlength="50"
							class="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-gendo-accent/50 focus:ring-1 focus:ring-gendo-accent/30 transition-all"
						/>
					</div>

					<div>
						<label class="block text-xs font-medium text-gray-400 mb-2">¿Cómo viajas?</label>
						<div class="flex flex-wrap gap-2">
							{#each TRAVEL_OPTIONS as opt}
								<button
									type="button"
									on:click={() => travelStyle = opt.id}
									class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all
										{travelStyle === opt.id
											? 'bg-gendo-accent/20 text-gendo-accent border border-gendo-accent/40 shadow-sm'
											: 'bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:border-white/20 hover:text-gray-300'}"
								>
									<span>{opt.emoji}</span>
									<span>{opt.label}</span>
								</button>
							{/each}
						</div>
					</div>

					<div>
						<label for="join-country" class="block text-xs font-medium text-gray-400 mb-1.5">País (opcional)</label>
						<input
							id="join-country"
							type="text"
							bind:value={homeCountry}
							placeholder="Ej. México, España, USA..."
							maxlength="50"
							class="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-gendo-accent/50 focus:ring-1 focus:ring-gendo-accent/30 transition-all"
						/>
					</div>

					<div>
						<label for="join-bio" class="block text-xs font-medium text-gray-400 mb-1.5">Bio (opcional)</label>
						<textarea
							id="join-bio"
							bind:value={bio}
							placeholder="Cuéntanos algo de ti... por ejemplo: 'Viajando por Iowa esta semana, me encanta la música en vivo'"
							maxlength="300"
							rows="2"
							class="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-gendo-accent/50 focus:ring-1 focus:ring-gendo-accent/30 transition-all resize-none"
						></textarea>
					</div>

					<!-- Acciones -->
					<div class="pt-2 space-y-3">
						<button
							type="submit"
							disabled={loading || !username.trim()}
							class="w-full py-4 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2
								{loading || !username.trim()
									? 'bg-gray-800 text-gray-500 cursor-not-allowed'
									: 'bg-gradient-to-r from-gendo-accent to-amber-600 text-white hover:from-gendo-accent/90 hover:to-amber-500 shadow-lg shadow-gendo-accent/20 hover:shadow-gendo-accent/30 hover:scale-[1.01] active:scale-[0.99]'}"
						>
							{#if loading}
								<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
								</svg>
								Creando tu cuenta...
							{:else}
								<span>✨</span>
								Crear cuenta y empezar
							{/if}
						</button>
						<button
							type="button"
							on:click={close}
							disabled={loading}
							class="w-full text-gray-500 hover:text-gray-400 text-sm py-2 transition-colors disabled:opacity-50"
						>
							Quizás más tarde
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
