<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { format } from 'date-fns';
	import { cleanVenueName, cleanEventTitle } from '$lib/cleanNames';

	// ── Config ───────────────────────────────────────────────────────────────
	/** Distancia mínima para considerar el cambio "dramático" */
	const DRAMATIC_KM   = 500;
	/** Tiempo en ms antes de auto-cerrar (15 s) */
	const AUTO_CLOSE_MS = 15_000;
	const HOME_KEY      = 'gendo_home';
	const SEEN_KEY      = 'gendo_welcome_seen'; // JSON: { cityId, ts }
	/** Horas antes de volver a mostrar el mismo mensaje para la misma ciudad */
	const COOLDOWN_H    = 48;

	// ── Tipos ────────────────────────────────────────────────────────────────
	type Persona = 'naturaleza' | 'noche' | 'cultura' | 'zen' | 'neutral';
	type Suggestion = {
		id: number; title: string; type: string;
		dateStart: number; price: string | null; venueName: string | null; sourceUrl: string | null;
	};
	type NearestCity = { id: number; name: string; country: string; state: string | null };

	// ── Plantillas personalizadas de mensaje ──────────────────────────────────
	const PERSONA_PHRASE: Record<Persona, string> = {
		naturaleza: 'amor por la naturaleza',
		noche:      'pasión por la vida nocturna',
		cultura:    'amor por la cultura y gastronomía',
		zen:        'espíritu zen',
		neutral:    'gusto por explorar',
	};

	const ACTIVITY_PHRASE: Record<Persona, string> = {
		naturaleza: 'mejores planes al aire libre y naturaleza',
		noche:      'mejores spots nocturnos y vida social',
		cultura:    'mejores planes culturales y gastronómicos',
		zen:        'mejores espacios de bienestar y calma',
		neutral:    'mejores actividades y eventos',
	};

	const PERSONA_EMOJI: Record<Persona, string> = {
		naturaleza: '🌿', noche: '🌙', cultura: '🎭', zen: '🧘', neutral: '🌍',
	};

	// Colores del toast por persona
	const PERSONA_STYLE: Record<Persona, { grad: string; border: string; accent: string; pill: string }> = {
		naturaleza: { grad: 'from-green-950 via-emerald-950 to-gray-950',  border: 'border-green-600/40',   accent: 'text-green-300',   pill: 'bg-green-500/20 text-green-300 border-green-500/30' },
		noche:      { grad: 'from-indigo-950 via-blue-950 to-gray-950',   border: 'border-indigo-600/40',  accent: 'text-indigo-300',  pill: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
		cultura:    { grad: 'from-fuchsia-950 via-purple-950 to-gray-950', border: 'border-fuchsia-600/40', accent: 'text-fuchsia-300', pill: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' },
		zen:        { grad: 'from-purple-950 via-violet-950 to-gray-950', border: 'border-purple-600/40',  accent: 'text-purple-300',  pill: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
		neutral:    { grad: 'from-gray-900 via-gray-950 to-gray-950',     border: 'border-gray-600/40',    accent: 'text-gray-300',    pill: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
	};

	// Emojis de tipo de evento
	const TYPE_EMOJI: Record<string, string> = {
		pesca: '🐟', ciclismo: '🚲', yoga: '🧘', social: '🍹',
		live_music: '🎵', theater: '🎭', sports: '🏟️', comedy: '😂',
		festival: '🎪', food: '🍽️', art: '🎨', cinema: '🎬', other: '📅',
	};

	// ── Estado ───────────────────────────────────────────────────────────────
	let visible        = false;
	let distanceKm     = 0;
	let nearestCity: NearestCity | null = null;
	let suggestions:  Suggestion[]      = [];
	let persona: Persona                = 'neutral';
	let homeCity                        = '';

	// Barra de progreso (auto-close)
	let progress    = 100;   // 100 → 0 en AUTO_CLOSE_MS
	let progressInt: ReturnType<typeof setInterval> | null = null;

	// ── Helpers ──────────────────────────────────────────────────────────────
	function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
		const R = 6371, r = Math.PI / 180;
		const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
		const a = Math.sin(dLat / 2) ** 2 +
			Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
		return R * 2 * Math.asin(Math.sqrt(a));
	}

	function formatDate(ms: number): string {
		const d = new Date(ms);
		const today = new Date();
		if (format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return `Hoy · ${format(d, 'h:mm a')}`;
		return format(d, 'MMM d · h:mm a');
	}

	function alreadySeen(cityId: number): boolean {
		try {
			const raw  = localStorage.getItem(SEEN_KEY);
			if (!raw) return false;
			const seen = JSON.parse(raw) as { cityId: number; ts: number };
			if (seen.cityId !== cityId) return false;
			const hoursAgo = (Date.now() - seen.ts) / 3_600_000;
			return hoursAgo < COOLDOWN_H;
		} catch { return false; }
	}

	function markSeen(cityId: number) {
		localStorage.setItem(SEEN_KEY, JSON.stringify({ cityId, ts: Date.now() }));
	}

	// ── Mensaje generado ─────────────────────────────────────────────────────
	$: welcomeMessage = nearestCity
		? buildMessage(persona, nearestCity.name, homeCity)
		: '';

	function buildMessage(p: Persona, city: string, home: string): string {
		const phrase    = PERSONA_PHRASE[p];
		const activity  = ACTIVITY_PHRASE[p];
		const homePart  = home ? ` en ${home}` : ' en casa';
		return `Según tu ${phrase}${homePart}, aquí tienes los ${activity} en ${city}.`;
	}

	$: style = PERSONA_STYLE[persona];

	// ── Lógica principal ─────────────────────────────────────────────────────
	async function check() {
		if (typeof window === 'undefined' || !navigator.geolocation) return;

		navigator.geolocation.getCurrentPosition(
			async ({ coords }) => {
				const { latitude: curLat, longitude: curLng } = coords;

				// Leer casa desde localStorage
				const stored = localStorage.getItem(HOME_KEY);
				if (!stored) return; // sin casa guardada, no mostrar

				let homeLat: number, homeLng: number;
				try {
					const h = JSON.parse(stored);
					homeLat = h.lat; homeLng = h.lng; homeCity = h.cityName ?? '';
				} catch { return; }

				// Calcular distancia desde casa
				const dist = haversineKm(homeLat, homeLng, curLat, curLng);
				if (dist < DRAMATIC_KM) return; // cambio NO dramático, silencio

				// Obtener ciudad + sugerencias + persona desde la API
				let data: Record<string, unknown>;
				try {
					const res = await fetch(`/api/geo?lat=${curLat}&lng=${curLng}`);
					if (!res.ok) return;
					data = await res.json();
				} catch { return; }

				const city = data['nearestCity'] as NearestCity | null;
				if (!city) return;

				// ¿Ya vimos este mensaje recientemente?
				if (alreadySeen(city.id)) return;

				distanceKm  = Math.round(dist);
				nearestCity = city;
				suggestions = ((data['suggestions'] as Suggestion[]) ?? []).slice(0, 3);
				persona     = (data['persona'] as Persona) ?? 'neutral';

				markSeen(city.id);
				visible = true;
				startCountdown();
			},
			() => { /* permiso denegado → silencio */ },
			{ timeout: 10_000, maximumAge: 5 * 60_000 }
		);
	}

	function startCountdown() {
		const TICK_MS = 100;
		const steps   = AUTO_CLOSE_MS / TICK_MS;
		const decrement = 100 / steps;

		progressInt = setInterval(() => {
			progress -= decrement;
			if (progress <= 0) dismiss();
		}, TICK_MS);
	}

	function dismiss() {
		visible = false;
		if (progressInt) { clearInterval(progressInt); progressInt = null; }
	}

	function pauseCountdown() {
		if (progressInt) { clearInterval(progressInt); progressInt = null; }
	}

	function resumeCountdown() {
		if (!progressInt && visible) startCountdown();
	}

	onMount(check);
	onDestroy(() => { if (progressInt) clearInterval(progressInt); });
</script>

{#if visible && nearestCity}
	<!-- Toast deslizante desde abajo-derecha -->
	<div
		class="fixed bottom-5 right-5 z-50 w-full max-w-sm"
		in:fly={{ y: 80, duration: 400 }}
		out:fly={{ y: 80, duration: 250 }}
		on:mouseenter={pauseCountdown}
		on:mouseleave={resumeCountdown}
		role="alert"
	>
		<div class="relative overflow-hidden rounded-2xl border bg-gradient-to-br shadow-2xl {style.grad} {style.border}">

			<!-- Barra de auto-cierre -->
			<div
				class="absolute top-0 left-0 h-0.5 bg-white/30 transition-none"
				style="width: {progress}%"
			></div>

			<!-- Fondo decorativo -->
			<div class="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

			<div class="relative p-4 space-y-3">

				<!-- Header -->
				<div class="flex items-start justify-between gap-3">
					<div class="flex items-start gap-2.5">
						<!-- Icono con animación de entrada -->
						<div class="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
							{PERSONA_EMOJI[persona]}
						</div>
						<div>
							<p class="font-bold text-white text-sm leading-tight">
								¡Hola explorador! 🌍
							</p>
							<p class="text-xs {style.accent} mt-0.5">
								Veo que estás en
								<strong class="text-white">{nearestCity.name}</strong>
								{nearestCity.state ? `(${nearestCity.state})` : `— ${nearestCity.country}`}
								<span class="text-gray-500 font-normal"> · {distanceKm.toLocaleString()} km de casa</span>
							</p>
						</div>
					</div>

					<button
						on:click={dismiss}
						class="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-xs"
						aria-label="Cerrar"
					>✕</button>
				</div>

				<!-- Mensaje personalizado -->
				<div class="bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
					<p class="text-gray-300 text-xs leading-relaxed">
						{welcomeMessage}
					</p>
				</div>

				<!-- Sugerencias de eventos -->
				{#if suggestions.length > 0}
					<div class="space-y-1.5">
						{#each suggestions as ev}
							<a
								href={ev.sourceUrl ?? `/event/${ev.id}`}
								target={ev.sourceUrl ? '_blank' : '_self'}
								rel="noopener noreferrer"
								on:click={dismiss}
								class="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
							>
								<span class="text-lg flex-shrink-0">{TYPE_EMOJI[ev.type] ?? '📅'}</span>
								<div class="flex-1 min-w-0">
									<p class="text-white text-xs font-medium group-hover:{style.accent} transition-colors truncate">{cleanEventTitle(ev.title, nearestCity?.name)}</p>
									<div class="flex items-center gap-2 mt-0.5">
										<span class="text-gray-500 text-xs">{formatDate(ev.dateStart)}</span>
										{#if ev.price === 'free'}
											<span class="text-green-400 text-xs font-medium">FREE</span>
										{/if}
										{#if ev.venueName}
											<span class="text-gray-600 text-xs truncate">· {cleanVenueName(ev.venueName, nearestCity?.name).slice(0, 20)}</span>
										{/if}
									</div>
								</div>
								<span class="text-gray-600 group-hover:text-gray-400 text-xs flex-shrink-0">→</span>
							</a>
						{/each}
					</div>
				{:else}
					<!-- Sin eventos aún: mensaje alternativo -->
					<p class="text-center text-xs text-gray-500 py-2">
						Aún no hay eventos registrados en {nearestCity.name} —<br/>
						pero ¡explora la ciudad! 🗺️
					</p>
				{/if}

				<!-- Footer -->
				<div class="flex items-center justify-between pt-0.5">
					<p class="text-gray-600 text-xs">
						Se cierra automáticamente
					</p>
					<a
						href="/city/{nearestCity.name.toLowerCase().replace(/\s+/g, '-')}"
						on:click={dismiss}
						class="text-xs {style.accent} hover:text-white transition-colors font-medium"
					>
						Ver todo en {nearestCity.name} →
					</a>
				</div>

			</div>
		</div>
	</div>
{/if}
