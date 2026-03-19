<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	const dispatch = createEventDispatcher<{ done: void }>();

	const STORAGE_KEY = 'gendo_onboarded';

	// ── Mapeo respuesta → seeds de categorías ──────────────────────────────
	const SEEDS: Record<string, Array<{ category: string; weight: number }>> = {
		tranquilo_zen:   [{ category: 'yoga', weight: 8 }, { category: 'art', weight: 4 }, { category: 'cinema', weight: 3 }],
		activo_social:   [{ category: 'social', weight: 8 }, { category: 'ciclismo', weight: 6 }, { category: 'sports', weight: 4 }, { category: 'live_music', weight: 3 }],
		luz_dia:         [{ category: 'ciclismo', weight: 6 }, { category: 'sports', weight: 5 }, { category: 'pesca', weight: 4 }, { category: 'food', weight: 3 }],
		noche:           [{ category: 'social', weight: 6 }, { category: 'live_music', weight: 6 }, { category: 'comedy', weight: 4 }, { category: 'theater', weight: 3 }],
		naturaleza:      [{ category: 'pesca', weight: 8 }, { category: 'ciclismo', weight: 7 }, { category: 'sports', weight: 5 }],
		cultura_gastro:  [{ category: 'art', weight: 7 }, { category: 'food', weight: 7 }, { category: 'theater', weight: 4 }, { category: 'cinema', weight: 4 }, { category: 'festival', weight: 3 }],
	};

	// ── Definición de pasos ────────────────────────────────────────────────
	const STEPS = [
		{
			question: '¿Cuál es tu ritmo?',
			subtitle:  'Cuéntanos cómo prefieres disfrutar tu tiempo libre.',
			options: [
				{
					id:          'tranquilo_zen',
					emoji:       '🧘',
					label:       'Tranquilo y Zen',
					description: 'Yoga, meditación, arte y planes en calma',
					gradient:    'from-purple-900/60 to-indigo-900/60',
					border:      'border-purple-500/40',
					hoverBorder: 'hover:border-purple-400',
					glow:        'hover:shadow-purple-900/40',
					accentText:  'text-purple-300',
					accentBg:    'bg-purple-500/20',
				},
				{
					id:          'activo_social',
					emoji:       '🏃',
					label:       'Activo y Social',
					description: 'Ciclismo, deportes, bares y vida nocturna',
					gradient:    'from-orange-900/60 to-rose-900/60',
					border:      'border-orange-500/40',
					hoverBorder: 'hover:border-orange-400',
					glow:        'hover:shadow-orange-900/40',
					accentText:  'text-orange-300',
					accentBg:    'bg-orange-500/20',
				},
			],
		},
		{
			question: '¿Tu momento favorito?',
			subtitle:  'El mundo cambia según la hora. ¿Cuándo eres más tú?',
			options: [
				{
					id:          'luz_dia',
					emoji:       '☀️',
					label:       'Amo la luz del día',
					description: 'Mañanas activas, tarde al aire libre, puestas de sol',
					gradient:    'from-yellow-900/60 to-amber-900/60',
					border:      'border-yellow-500/40',
					hoverBorder: 'hover:border-yellow-400',
					glow:        'hover:shadow-yellow-900/40',
					accentText:  'text-yellow-300',
					accentBg:    'bg-yellow-500/20',
				},
				{
					id:          'noche',
					emoji:       '🌙',
					label:       'Prefiero la noche',
					description: 'Conciertos, bares, shows y planes nocturnos',
					gradient:    'from-blue-900/60 to-indigo-900/60',
					border:      'border-blue-500/40',
					hoverBorder: 'hover:border-blue-400',
					glow:        'hover:shadow-blue-900/40',
					accentText:  'text-blue-300',
					accentBg:    'bg-blue-500/20',
				},
			],
		},
		{
			question: '¿Qué te mueve?',
			subtitle:  'Elige lo que más te emociona descubrir en una ciudad.',
			options: [
				{
					id:          'naturaleza',
					emoji:       '🌿',
					label:       'Naturaleza y Deporte',
					description: 'Pesca, senderismo, ciclismo de montaña, deportes',
					gradient:    'from-green-900/60 to-teal-900/60',
					border:      'border-green-500/40',
					hoverBorder: 'hover:border-green-400',
					glow:        'hover:shadow-green-900/40',
					accentText:  'text-green-300',
					accentBg:    'bg-green-500/20',
				},
				{
					id:          'cultura_gastro',
					emoji:       '🎭',
					label:       'Cultura y Gastronomía',
					description: 'Arte, teatro, cine, festivales y restaurantes locales',
					gradient:    'from-fuchsia-900/60 to-pink-900/60',
					border:      'border-fuchsia-500/40',
					hoverBorder: 'hover:border-fuchsia-400',
					glow:        'hover:shadow-fuchsia-900/40',
					accentText:  'text-fuchsia-300',
					accentBg:    'bg-fuchsia-500/20',
				},
			],
		},
	] as const;

	// ── Estado ─────────────────────────────────────────────────────────────
	let visible     = false;
	let step        = 0;           // 0-2
	let direction   = 1;           // +1 avanzar, -1 retroceder
	let answers:    string[] = []; // ids de las respuestas seleccionadas
	let saving      = false;
	let done        = false;
	let stepKey     = 0;           // forzar re-render del bloque {#key} para animación

	onMount(() => {
		if (!localStorage.getItem(STORAGE_KEY)) {
			visible = true;
		}
	});

	function select(optionId: string) {
		answers[step] = optionId;
	}

	async function next() {
		if (!answers[step]) return; // no permitir avanzar sin selección
		direction = 1;

		if (step < STEPS.length - 1) {
			stepKey++;
			step++;
		} else {
			await finish();
		}
	}

	function back() {
		if (step === 0) return;
		direction = -1;
		stepKey++;
		step--;
	}

	async function finish() {
		saving = true;

		// Combinar todos los seeds de las 3 respuestas
		const allSeeds = new Map<string, number>();
		for (const answerId of answers) {
			for (const s of SEEDS[answerId] ?? []) {
				allSeeds.set(s.category, (allSeeds.get(s.category) ?? 0) + s.weight);
			}
		}
		const seeds = [...allSeeds.entries()].map(([category, weight]) => ({ category, weight }));

		try {
			await fetch('/api/preferences/seed', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ seeds }),
			});
		} catch { /* si falla la red, ignorar y continuar */ }

		localStorage.setItem(STORAGE_KEY, '1');
		saving = false;
		done   = true;

		// Esperar la animación de éxito antes de cerrar
		await new Promise(r => setTimeout(r, 1400));
		visible = false;
		dispatch('done');
	}

	function skip() {
		localStorage.setItem(STORAGE_KEY, '1');
		visible = false;
		dispatch('done');
	}

	$: currentStep = STEPS[step];
	$: canContinue = !!answers[step];
	$: isLastStep  = step === STEPS.length - 1;
</script>

{#if visible}
	<!-- Overlay full-screen -->
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950"
		transition:fade={{ duration: 300 }}
	>
		<!-- Fondo decorativo animado -->
		<div class="absolute inset-0 overflow-hidden pointer-events-none">
			<div class="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse"></div>
			<div class="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s"></div>
			<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/5 rounded-full blur-3xl"></div>
		</div>

		<div class="relative w-full max-w-xl px-5 flex flex-col gap-6">

			{#if done}
				<!-- ── Pantalla de éxito ──────────────────────────────────────── -->
				<div class="text-center" in:fly={{ y: 20, duration: 400 }}>
					<div class="text-6xl mb-4 animate-bounce">🎉</div>
					<h2 class="text-2xl font-bold text-white mb-2">¡Todo listo!</h2>
					<p class="text-gray-400">Personalizando Gendo para ti...</p>
					<div class="mt-6 flex justify-center gap-2 flex-wrap">
						{#each answers as answerId}
							{@const seeds = SEEDS[answerId] ?? []}
							{#each seeds.slice(0, 2) as s}
								<span class="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full">
									{s.category}
								</span>
							{/each}
						{/each}
					</div>
				</div>
			{:else}
				<!-- ── Header: logo + saltar ────────────────────────────────── -->
				<div class="flex items-center justify-between">
					<span class="text-xl font-bold text-white tracking-tight">Gendo</span>
					<button
						on:click={skip}
						class="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1 rounded-full hover:bg-gray-800"
					>
						Saltar →
					</button>
				</div>

				<!-- ── Barra de progreso ────────────────────────────────────── -->
				<div class="space-y-2">
					<div class="flex justify-between text-xs text-gray-500">
						<span>Paso {step + 1} de {STEPS.length}</span>
						<span>{Math.round(((step) / STEPS.length) * 100)}% completado</span>
					</div>
					<div class="h-1.5 bg-gray-800 rounded-full overflow-hidden">
						<div
							class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
							style="width: {((step) / STEPS.length) * 100}%"
						></div>
					</div>
					<!-- Dots de paso -->
					<div class="flex justify-center gap-2 pt-1">
						{#each STEPS as _, i}
							<div class="rounded-full transition-all duration-300 {i === step ? 'w-6 h-2 bg-indigo-500' : i < step ? 'w-2 h-2 bg-indigo-700' : 'w-2 h-2 bg-gray-700'}"></div>
						{/each}
					</div>
				</div>

				<!-- ── Pregunta + opciones (animadas por step) ──────────────── -->
				{#key stepKey}
					<div
						in:fly={{ x: direction * 60, duration: 350, easing: cubicOut }}
						out:fly={{ x: direction * -60, duration: 250, easing: cubicOut }}
						class="space-y-5"
					>
						<!-- Pregunta -->
						<div class="text-center space-y-1.5">
							<h1 class="text-2xl sm:text-3xl font-bold text-white leading-tight">
								{currentStep.question}
							</h1>
							<p class="text-gray-400 text-sm">{currentStep.subtitle}</p>
						</div>

						<!-- Opciones -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							{#each currentStep.options as opt}
								{@const isSelected = answers[step] === opt.id}
								<button
									on:click={() => select(opt.id)}
									class="group relative text-left rounded-2xl p-5 border-2 transition-all duration-200 bg-gradient-to-br
										{opt.gradient}
										{isSelected
											? opt.border.replace('/40', '') + ' scale-[1.02] shadow-xl ' + opt.glow
											: 'border-white/10 hover:scale-[1.01] ' + opt.hoverBorder + ' hover:shadow-lg ' + opt.glow}"
								>
									<!-- Checkmark cuando está seleccionado -->
									{#if isSelected}
										<div
											class="absolute top-3 right-3 w-6 h-6 rounded-full {opt.accentBg} flex items-center justify-center"
											in:fly={{ y: -6, duration: 200 }}
										>
											<svg class="w-3.5 h-3.5 {opt.accentText}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
											</svg>
										</div>
									{/if}

									<!-- Emoji grande -->
									<div class="text-4xl mb-3 transition-transform duration-200 group-hover:scale-110 {isSelected ? 'scale-110' : ''}">
										{opt.emoji}
									</div>

									<!-- Título -->
									<h3 class="font-bold text-white text-base mb-1.5 {isSelected ? opt.accentText : ''}">
										{opt.label}
									</h3>

									<!-- Descripción -->
									<p class="text-gray-400 text-xs leading-relaxed">
										{opt.description}
									</p>

									<!-- Borde brillante en la parte superior cuando está seleccionado -->
									{#if isSelected}
										<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-t-2xl"></div>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/key}

				<!-- ── Botones de navegación ────────────────────────────────── -->
				<div class="flex items-center gap-3 pt-1">
					<!-- Botón atrás -->
					{#if step > 0}
						<button
							on:click={back}
							class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-4 py-2.5 rounded-xl hover:bg-gray-800"
						>
							← Atrás
						</button>
					{/if}

					<!-- Botón continuar/finalizar -->
					<button
						on:click={next}
						disabled={!canContinue || saving}
						class="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200
							{canContinue
								? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/40 hover:scale-[1.01] active:scale-[0.99]'
								: 'bg-gray-800 text-gray-600 cursor-not-allowed'}"
					>
						{#if saving}
							<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
							</svg>
							Guardando...
						{:else if isLastStep}
							Finalizar y entrar a Gendo ✨
						{:else}
							Siguiente →
						{/if}
					</button>
				</div>

				<!-- Nota de privacidad -->
				<p class="text-center text-xs text-gray-600">
					Tus preferencias se guardan localmente y solo se usan para personalizar los eventos que ves.
				</p>
			{/if}

		</div>
	</div>
{/if}
