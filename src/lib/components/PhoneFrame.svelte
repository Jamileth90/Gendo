<script lang="ts">
	/**
	 * PhoneFrame — Muestra la app como si estuviera en un teléfono.
	 * Activar con ?phone=1 en la URL o con el botón flotante.
	 */
	import { onMount } from 'svelte';

	const PHONE_KEY = 'gendo_phone_preview';
	const PHONE_WIDTH = 390;
	const PHONE_HEIGHT = 844;

	let enabled = false;

	onMount(() => {
		const fromUrl = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('phone') === '1';
		const fromStorage = typeof window !== 'undefined' && localStorage.getItem(PHONE_KEY) === '1';
		enabled = fromUrl || fromStorage;
		if (fromUrl && typeof window !== 'undefined') {
			localStorage.setItem(PHONE_KEY, '1');
		}
	});

	function toggle() {
		enabled = !enabled;
		if (typeof window !== 'undefined') {
			localStorage.setItem(PHONE_KEY, enabled ? '1' : '0');
		}
	}
</script>

{#if enabled}
	<div class="phone-frame-container">
		<div class="phone-frame" style="width: {PHONE_WIDTH}px; height: {PHONE_HEIGHT}px;">
			<!-- Notch -->
			<div class="phone-notch"></div>
			<!-- Pantalla -->
			<div class="phone-screen">
				<slot />
			</div>
		</div>
		<button
			class="phone-toggle"
			onclick={toggle}
			title="Salir de vista teléfono"
		>
			↗ Salir
		</button>
	</div>
{:else}
	<div class="phone-frame-off">
		<slot />
		<button
			class="phone-toggle-off"
			onclick={toggle}
			title="Ver como teléfono (?phone=1)"
		>
			📱
		</button>
	</div>
{/if}

<style>
	.phone-frame-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
		padding: 2rem;
	}

	.phone-frame {
		background: #000;
		border-radius: 3rem;
		padding: 12px;
		box-shadow:
			0 0 0 3px #333,
			0 0 0 6px #222,
			0 25px 50px -12px rgba(0, 0, 0, 0.7),
			inset 0 0 0 1px rgba(255, 255, 255, 0.05);
		position: relative;
	}

	.phone-notch {
		position: absolute;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		width: 120px;
		height: 28px;
		background: #000;
		border-radius: 0 0 1.25rem 1.25rem;
		z-index: 10;
	}

	.phone-screen {
		width: 100%;
		height: 100%;
		background: var(--color-bg, #0c0c0e);
		border-radius: 2.25rem;
		overflow: hidden;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}

	.phone-toggle {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 1000;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		color: white;
		font-size: 0.875rem;
		cursor: pointer;
		backdrop-filter: blur(8px);
	}

	.phone-toggle:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.phone-frame-off {
		min-height: 100vh;
		position: relative;
	}

	.phone-toggle-off {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 1000;
		width: 3rem;
		height: 3rem;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		color: white;
		font-size: 1.25rem;
		cursor: pointer;
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.phone-toggle-off:hover {
		background: rgba(0, 0, 0, 0.7);
	}
</style>
