<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { goto } from '$app/navigation';

	// ── Config ────────────────────────────────────────────────────────────────
	const STORAGE_KEY  = 'gendo_greeting_shown';   // sessionStorage (se borra al cerrar pestaña)
	const AUTO_DISMISS = 12_000;                    // ms antes de auto-cerrar

	// ── Estado ────────────────────────────────────────────────────────────────
	let visible      = false;
	let greeting     = '';
	let sub          = '';
	let cta          = '';
	let ctaPath      = '/';
	let avatarUrl:   string | null = null;
	let personaEmoji = '✨';
	let progress     = 100;
	let timer:       ReturnType<typeof setInterval> | null = null;
	let paused       = false;

	// Clima
	interface WeatherData {
		condition:   string;
		emoji:       string;
		description: string;
		isBad:       boolean;
	}
	let weather:         WeatherData | null = null;
	let weatherOverride = false;

	// ── Estilos por persona / estado de clima ─────────────────────────────────
	type Persona = 'naturaleza' | 'noche' | 'cultura' | 'zen' | 'neutral';

	const PERSONA_STYLE: Record<Persona, { grad: string; border: string; accent: string }> = {
		naturaleza: { grad: 'from-green-950/90 to-gray-900/95',  border: 'border-green-500/40',  accent: 'bg-green-500 hover:bg-green-400'   },
		noche:      { grad: 'from-indigo-950/90 to-gray-900/95', border: 'border-indigo-500/40', accent: 'bg-indigo-500 hover:bg-indigo-400'  },
		cultura:    { grad: 'from-amber-950/90 to-gray-900/95',  border: 'border-amber-500/40',  accent: 'bg-amber-500 hover:bg-amber-400'    },
		zen:        { grad: 'from-purple-950/90 to-gray-900/95', border: 'border-purple-500/40', accent: 'bg-purple-500 hover:bg-purple-400'  },
		neutral:    { grad: 'from-gray-900/95 to-gray-800/95',   border: 'border-gray-600/40',   accent: 'bg-indigo-500 hover:bg-indigo-400'  },
	};

	// Cuando hay mal tiempo el gradiente cambia a azul-gris lluvia
	const RAIN_STYLE = { grad: 'from-slate-900/95 to-gray-900/95', border: 'border-sky-700/40', accent: 'bg-sky-600 hover:bg-sky-500' };

	let style = PERSONA_STYLE['neutral'];
	let persona: Persona = 'neutral';

	// ── Lifecycle ─────────────────────────────────────────────────────────────
	onMount(async () => {
		if (sessionStorage.getItem(STORAGE_KEY)) return;

		try {
			const res = await fetch('/api/greeting');
			if (!res.ok) return;

			const data   = await res.json();
			greeting     = data.greeting        ?? '';
			sub          = data.sub             ?? '';
			cta          = data.cta             ?? 'Explorar';
			ctaPath      = data.ctaPath         ?? '/';
			avatarUrl    = data.avatarUrl       ?? null;
			personaEmoji = data.personaEmoji    ?? '✨';
			persona      = (data.persona as Persona) ?? 'neutral';
			weather      = data.weather         ?? null;
			weatherOverride = data.weatherOverride ?? false;

			// Si hay mal tiempo, usar gradiente de lluvia; si no, el de la persona
			style = (weatherOverride && weather?.isBad)
				? RAIN_STYLE
				: (PERSONA_STYLE[persona] ?? PERSONA_STYLE['neutral']);

			await new Promise(r => setTimeout(r, 900));

			visible = true;
			sessionStorage.setItem(STORAGE_KEY, '1');
			startCountdown();
		} catch {
			// Silencioso: si la API falla no interrumpe la app
		}
	});

	onDestroy(() => stopCountdown());

	// ── Countdown ─────────────────────────────────────────────────────────────
	function startCountdown() {
		const step  = 100;
		const total = AUTO_DISMISS;
		let elapsed = 0;

		timer = setInterval(() => {
			if (paused) return;
			elapsed += step;
			progress = Math.max(0, 100 - (elapsed / total) * 100);
			if (elapsed >= total) dismiss();
		}, step);
	}

	function stopCountdown() {
		if (timer) { clearInterval(timer); timer = null; }
	}

	// ── Acciones ──────────────────────────────────────────────────────────────
	function dismiss() { stopCountdown(); visible = false; }
	function handleCta() { dismiss(); goto(ctaPath); }
</script>

{#if visible}
	<!-- Tarjeta desliza desde arriba-derecha -->
	<div
		class="fixed top-4 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)]
		       rounded-2xl border backdrop-blur-md shadow-2xl overflow-hidden
		       bg-gradient-to-br {style.grad} {style.border}"
		transition:fly={{ y: -36, duration: 380, opacity: 0 }}
		role="dialog"
		aria-live="polite"
		on:mouseenter={() => (paused = true)}
		on:mouseleave={() => (paused = false)}
	>
		<!-- Barra de progreso de auto-dismiss -->
		<div class="h-0.5 bg-gray-700/50 relative overflow-hidden">
			<div class="absolute inset-y-0 left-0 bg-white/25 transition-none" style="width:{progress}%"></div>
		</div>

		<div class="p-4">
			<!-- Fila superior: avatar + texto + cerrar -->
			<div class="flex items-start gap-3">
				<!-- Avatar o emoji de persona -->
				<div class="flex-shrink-0 w-11 h-11 rounded-full overflow-hidden
				            ring-2 ring-white/10 bg-gray-800 flex items-center justify-center">
					{#if avatarUrl}
						<img src={avatarUrl} alt="avatar" class="w-full h-full object-cover" />
					{:else}
						<span class="text-2xl leading-none">
							{weatherOverride && weather ? weather.emoji : personaEmoji}
						</span>
					{/if}
				</div>

				<div class="flex-1 min-w-0">
					<p class="text-white font-semibold text-sm leading-snug">{greeting}</p>
					<p class="text-gray-300 text-xs mt-1 leading-relaxed">{sub}</p>
				</div>

				<button
					on:click={dismiss}
					class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
					       text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
					aria-label="Cerrar"
				>✕</button>
			</div>

			<!-- Chip de clima (siempre visible si tenemos datos) -->
			{#if weather}
				<div class="mt-2.5 flex items-center gap-1.5">
					<span class="text-sm leading-none">{weather.emoji}</span>
					<span class="text-xs {weather.isBad ? 'text-sky-300' : 'text-gray-400'}">
						Cedar Rapids · {weather.description}
					</span>
				</div>
			{/if}

			<!-- CTA -->
			<button
				on:click={handleCta}
				class="mt-3 w-full py-2 px-4 rounded-xl text-white text-sm font-medium
				       transition-all active:scale-95 {style.accent}"
			>
				{cta} →
			</button>
		</div>
	</div>
{/if}
