<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	let { children } = $props();
	
	const navItems = [
		{ name: 'Dashboard', href: '/' },
		{ name: 'Fragments', href: '/fragments' },
		{ name: 'Simulations', href: '/simulations' },
		{ name: 'About', href: '/about' }
	];
</script>

<div class="min-h-screen flex flex-col">
	<header class="bg-white shadow">
		<div class="container mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center">
				<a href="/" class="flex items-center">
					<span class="text-blue-700 text-xl font-bold">FinSim</span>
				</a>
			</div>
			
			<nav class="hidden md:flex space-x-8">
				{#each navItems as item}
					<a 
						href={item.href} 
						class="text-gray-600 hover:text-blue-700 px-3 py-2 text-sm font-medium" 
						aria-current={$page.url.pathname === item.href ? 'page' : undefined}
					>
						{item.name}
					</a>
				{/each}
			</nav>
			
			<div class="md:hidden">
				<button type="button" class="text-gray-500 hover:text-blue-700">
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
			</div>
		</div>
	</header>

	<main class="flex-grow">
		{@render children()}
	</main>

	<footer class="bg-gray-800 text-white py-8">
		<div class="container mx-auto px-4">
			<div class="flex flex-col md:flex-row justify-between">
				<div class="mb-4 md:mb-0">
					<h3 class="text-lg font-semibold mb-2">FinSim</h3>
					<p class="text-gray-400 text-sm">Financial planning and simulation tool</p>
				</div>
				<div>
					<h4 class="text-md font-medium mb-2">Resources</h4>
					<ul class="text-gray-400 text-sm">
						<li class="mb-1"><a href="https://github.com/example/finsim" class="hover:text-white">GitHub</a></li>
						<li class="mb-1"><a href="/docs" class="hover:text-white">Documentation</a></li>
					</ul>
				</div>
			</div>
			<div class="mt-8 pt-4 border-t border-gray-700 text-gray-400 text-sm">
				<p>© {new Date().getFullYear()} FinSim. All rights reserved.</p>
			</div>
		</div>
	</footer>
</div>
