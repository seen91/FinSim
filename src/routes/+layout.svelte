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

<div class="min-h-screen bg-gray-100 flex flex-col">
	<nav class="bg-white shadow-sm">
		<div class="container mx-auto px-4 py-3 flex justify-between items-center">
			<div class="flex items-center">
				<a href="/" class="font-bold text-xl text-blue-600">FinSim</a>
			</div>
			
			<div class="hidden md:flex space-x-6">
				<a href="/" class="text-gray-700 hover:text-blue-600 transition-colors">Home</a>
				<a href="#" class="text-gray-700 hover:text-blue-600 transition-colors">Documentation</a>
				<a href="https://github.com/your-username/finsim" target="_blank" rel="noopener noreferrer" class="text-gray-700 hover:text-blue-600 transition-colors">GitHub</a>
			</div>
		</div>
	</nav>

	<main class="flex-grow">
		{@render children()}
	</main>

	<footer class="bg-gray-800 text-white py-8">
		<div class="container mx-auto px-4">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div>
					<h3 class="text-lg font-semibold mb-4">FinSim</h3>
					<p class="text-gray-300">
						A financial planning and simulation tool for calculating compound interest scenarios and modeling 
						complex financial strategies across different time periods.
					</p>
				</div>
				
				<div>
					<h3 class="text-lg font-semibold mb-4">Resources</h3>
					<ul class="space-y-2">
						<li><a href="#" class="text-gray-300 hover:text-white transition-colors">User Guide</a></li>
						<li><a href="#" class="text-gray-300 hover:text-white transition-colors">Financial Formulas</a></li>
						<li><a href="#" class="text-gray-300 hover:text-white transition-colors">Privacy Policy</a></li>
					</ul>
				</div>
				
				<div>
					<h3 class="text-lg font-semibold mb-4">About</h3>
					<p class="text-gray-300">
						FinSim is an open-source project built with Svelte and TypeScript.
						Contributions and feedback are welcome.
					</p>
					<div class="mt-4">
						<a 
							href="https://github.com/your-username/finsim" 
							target="_blank" 
							rel="noopener noreferrer"
							class="inline-block px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
						>
							View on GitHub
						</a>
					</div>
				</div>
			</div>
			
			<div class="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
				<p>© {new Date().getFullYear()} FinSim. All rights reserved.</p>
			</div>
		</div>
	</footer>
</div>
