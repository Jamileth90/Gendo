<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import OnboardingModal from '$lib/components/OnboardingModal.svelte';
	import WelcomeNotification from '$lib/components/WelcomeNotification.svelte';
	import SmartGreeting from '$lib/components/SmartGreeting.svelte';
	import PhoneFrame from '$lib/components/PhoneFrame.svelte';
	import UserMenu from '$lib/components/UserMenu.svelte';
	import JoinModal from '$lib/components/JoinModal.svelte';

	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch(() => {});
		}
	});

	$: meta = $page.data.meta ?? { title: 'Gendo — Events in Cedar Rapids, IA', description: 'Discover events and things to do in Cedar Rapids, Iowa.' };
	$: user = $page.data.user ?? null;

	let showJoinModal = false;
	function onJoinSuccess() {
		showJoinModal = false;
		invalidateAll();
	}
</script>
<svelte:head>
	<title>{meta.title}</title>
	{#if meta.description}
		<meta name="description" content={meta.description} />
	{/if}
</svelte:head>
<!-- UserMenu y JoinModal fuera de PhoneFrame para que siempre estén visibles -->
<UserMenu {user} onOpenJoin={() => (showJoinModal = true)} onLogout={invalidateAll} />
<JoinModal bind:open={showJoinModal} on:success={onJoinSuccess} />
<PhoneFrame>
	<OnboardingModal />
	<WelcomeNotification />
	<SmartGreeting />
	<slot />
</PhoneFrame>
