<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import OnboardingModal from '$lib/components/OnboardingModal.svelte';
	import WelcomeNotification from '$lib/components/WelcomeNotification.svelte';
	import SmartGreeting from '$lib/components/SmartGreeting.svelte';
	import PhoneFrame from '$lib/components/PhoneFrame.svelte';

	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch(() => {});
		}
	});

	$: meta = $page.data.meta ?? { title: 'Gendo — Events in Cedar Rapids, IA', description: 'Discover events and things to do in Cedar Rapids, Iowa.' };
</script>
<svelte:head>
	<title>{meta.title}</title>
	{#if meta.description}
		<meta name="description" content={meta.description} />
	{/if}
</svelte:head>
<PhoneFrame>
	<OnboardingModal />
	<WelcomeNotification />
	<SmartGreeting />
	<slot />
</PhoneFrame>
