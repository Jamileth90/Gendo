<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';

	export let data: PageData;

	const travelLabel: Record<string, string> = {
		backpacker: 'Mochilero',
		nomad: 'Nómada digital',
		solo_traveler: 'Solo traveler',
		traveler: 'Viajero',
		local: 'Local',
		expat: 'Expatriado',
	};

	async function logout() {
		await fetch('/api/auth?action=logout', { method: 'POST' });
		await invalidateAll();
		goto('/');
	}
</script>

<svelte:head>
	<title>Mi perfil — Gendo</title>
</svelte:head>

<div class="min-h-screen bg-gendo-bg text-white py-8 px-4">
	<div class="max-w-md mx-auto">
		<a href="/" class="text-gendo-accent hover:text-white text-sm mb-6 inline-block">← Volver</a>

		<div class="bg-gendo-surface border border-white/[0.06] rounded-2xl p-6">
			<!-- Avatar y nombre -->
			<div class="flex items-center gap-4 mb-6">
				<img
					src={data.user.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.display_name ?? data.user.username)}&background=random&color=fff&size=128`}
					alt={data.user.username}
					class="w-20 h-20 rounded-full"
				/>
				<div>
					<h1 class="text-xl font-bold text-white">{data.user.display_name ?? data.user.username}</h1>
					<p class="text-gray-400 text-sm">@{data.user.username}</p>
				</div>
			</div>

			<!-- Info del perfil -->
			<dl class="space-y-4 text-sm">
				{#if data.user.home_country}
					<div>
						<dt class="text-gray-500 mb-0.5">País</dt>
						<dd class="text-white">{data.user.home_country}</dd>
					</div>
				{/if}
				{#if data.user.travel_style}
					<div>
						<dt class="text-gray-500 mb-0.5">Estilo de viaje</dt>
						<dd class="text-white">{travelLabel[data.user.travel_style] ?? data.user.travel_style}</dd>
					</div>
				{/if}
				{#if data.user.bio}
					<div>
						<dt class="text-gray-500 mb-0.5">Bio</dt>
						<dd class="text-gray-300">{data.user.bio}</dd>
					</div>
				{/if}
			</dl>

			<p class="text-gray-500 text-xs mt-6">La edición de perfil estará disponible pronto.</p>

			<button
				on:click={logout}
				class="mt-6 w-full py-3 rounded-xl text-red-400 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-colors text-sm font-medium"
			>
				Cerrar sesión
			</button>
		</div>
	</div>
</div>
