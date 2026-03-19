<script lang="ts">
	/**
	 * WorldSearchButton — Botón compacto que abre un modal de búsqueda global.
	 * Permite buscar ciudades, pueblos, provincias y países del mundo.
	 */
	import { createEventDispatcher, onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import CitySearch from './CitySearch.svelte';

	const dispatch = createEventDispatcher<{
		discover: { lat: number; lng: number; cityName: string; countryCode: string };
	}>();

	export let notifPermission: NotificationPermission = 'default';
	export let citySearchLoading = false;

	let open = false;

	function openModal()  { open = true;  document.body.style.overflow = 'hidden'; }
	function closeModal() { open = false; document.body.style.overflow = ''; }

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeModal();
	}

	// onMount solo corre en el navegador — retornamos la función de limpieza
	onMount(() => {
		window.addEventListener('keydown', onKeydown);
		return () => {
			window.removeEventListener('keydown', onKeydown);
			document.body.style.overflow = '';
		};
	});

	function onDiscover(e: CustomEvent<{ lat: number; lng: number; cityName: string; countryCode: string }>) {
		dispatch('discover', e.detail);
		closeModal();
	}
</script>

<!-- ── Botón compacto: búsqueda inteligente de cualquier lugar ── -->
<div class="flex items-center gap-2">
	<button
		data-world-search
		on:click={openModal}
		class="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08]
		       hover:border-gendo-accent/40 text-white px-4 py-2.5 rounded-xl text-sm font-medium
		       transition-all group"
		title="Buscar ciudad, pueblo, país o cualquier lugar"
	>
		<span class="text-base">🌍</span>
		<span class="hidden sm:inline">Buscar lugar</span>
		<span class="sm:hidden">Buscar</span>
	</button>

	<!-- Notificaciones (compacto) -->
	{#if notifPermission === 'default'}
		<button
			on:click
			title="Activar notificaciones"
			class="p-2.5 rounded-xl bg-gendo-muted hover:bg-gendo-muted/80 border border-white/[0.06]
			       hover:border-gendo-accent/40 text-zinc-400 hover:text-gendo-accent transition-all text-base"
		>🔔</button>
	{:else if notifPermission === 'granted'}
		<span class="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-base" title="Notificaciones activas">🔔</span>
	{/if}
</div>

<!-- ── Modal de búsqueda ── -->
{#if open}
	<!-- Fondo oscuro -->
	<div
		transition:fade={{ duration: 180 }}
		class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
		on:click={closeModal}
		role="presentation"
	/>

	<!-- Panel del modal — full screen on mobile, centered on desktop -->
	<div
		transition:fly={{ y: -20, duration: 220 }}
		class="fixed inset-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
		       sm:w-full sm:max-w-lg sm:max-h-[85vh] z-50 bg-gendo-surface border-0 sm:border sm:border-white/[0.06]
		       rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:mx-4"
	>
		<!-- Cabecera del modal -->
		<div class="flex items-center justify-between px-4 sm:px-5 pt-5 pb-3 border-b border-white/[0.06]">
			<h2 class="text-white font-bold text-base">🌍 Buscar lugar</h2>
			<button
				on:click={closeModal}
				class="text-gray-500 hover:text-white transition-colors text-lg leading-none p-3 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
			>✕</button>
		</div>

		<!-- Buscador: ciudad, pueblo, país… lo que el usuario pida -->
		<div class="px-5 py-4">
			<CitySearch
				on:discover={onDiscover}
				on:loading={e => { citySearchLoading = e.detail; if (!e.detail) closeModal(); }}
			/>
		</div>

		{#if citySearchLoading}
			<div class="px-5 pb-4">
				<div class="flex items-center gap-3 bg-gendo-accent/10 border border-gendo-accent/20 rounded-xl px-4 py-3">
					<svg class="w-4 h-4 animate-spin text-gendo-accent flex-shrink-0" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
					</svg>
					<p class="text-gendo-accent text-sm">Buscando eventos cerca…</p>
				</div>
			</div>
		{/if}

		<div class="px-5 pb-3 flex justify-end">
			<kbd class="text-xs bg-gendo-muted border border-white/[0.06] text-gendo-text-muted px-1.5 py-0.5 rounded">Esc</kbd>
		</div>
	</div>
{/if}
