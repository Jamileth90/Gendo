<script lang="ts">
	/**
	 * UserMenu — Botón de perfil fijo en esquina superior derecha.
	 * Se renderiza en document.body vía portal para garantizar visibilidad.
	 */
	import { browser } from '$app/environment';
	import { fly } from 'svelte/transition';

	export let user: { id: number; username: string; display_name: string | null; avatar_url: string | null } | null = null;
	export let onOpenJoin: () => void = () => {};
	export let onLogout: () => void = () => {};

	let open = false;

	/** Portal: mueve el nodo a body al montar (solo en cliente) */
	function usePortal(node: HTMLElement) {
		if (typeof document !== 'undefined' && document.body) {
			document.body.appendChild(node);
		}
		return { destroy: () => node.parentNode?.removeChild(node) };
	}

	async function handleLogout() {
		open = false;
		await fetch('/api/auth?action=logout', { method: 'POST' });
		onLogout();
	}
</script>

{#if browser}
	<!-- Portal a body: garantiza visibilidad en cualquier layout -->
	<div
		use:usePortal
		role="navigation"
		aria-label="Menú de usuario"
		style="position: fixed; top: 1rem; right: 1rem; z-index: 2147483647;"
		class="backdrop-blur-sm bg-black/60 rounded-xl p-1 border border-white/10"
	>
	{#if user}
		<!-- Usuario logueado: avatar + dropdown -->
		<div class="relative">
			<button
				on:click={() => open = !open}
				class="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
				aria-haspopup="true"
				aria-expanded={open}
			>
				<img
					src={user.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name ?? user.username)}&background=random&color=fff&size=64`}
					alt={user.username}
					class="w-8 h-8 rounded-full"
				/>
				<span class="text-white text-sm font-medium hidden sm:inline max-w-[100px] truncate">
					{user.display_name ?? user.username}
				</span>
				<svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{#if open}
				<div
					transition:fly={{ y: -8, duration: 200 }}
					class="absolute left-0 mt-2 w-48 py-1 bg-gendo-surface border border-white/[0.08] rounded-xl shadow-xl overflow-hidden"
				>
					<a
						href="/profile"
						on:click={() => open = false}
						class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
						Mi perfil
					</a>
					<button
						on:click={handleLogout}
						class="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-colors text-left"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
						Cerrar sesión
					</button>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Sin usuario: botón Entrar — blanco puro para máx. visibilidad en fondo oscuro -->
		<button
			on:click={onOpenJoin}
			style="background: white; color: #0c0c0e; box-shadow: 0 4px 20px rgba(0,0,0,0.5);"
			class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border-2 border-white/90 hover:bg-gray-100 transition-all"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
			</svg>
			Entrar
		</button>
	{/if}
</div>

<!-- Cerrar dropdown al hacer clic fuera -->
{#if open}
	<button
		aria-label="Cerrar menú"
		class="fixed inset-0 z-[9998]"
		on:click={() => open = false}
		tabindex="-1"
	/>
{/if}
