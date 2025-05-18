<script lang="ts">
  import { twMerge } from "tailwind-merge";
  
  export let type: "button" | "submit" | "reset" = "button";
  export let variant: "primary" | "secondary" | "outline" = "primary";
  export let size: "sm" | "md" | "lg" = "md";
  export let disabled = false;
  export let classes = "";
  
  const baseStyles = "font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400",
    outline: "bg-transparent border border-gray-300 hover:bg-gray-100 focus:ring-gray-400"
  };
  
  const sizes = {
    sm: "py-1 px-2 text-sm",
    md: "py-2 px-4 text-base",
    lg: "py-3 px-6 text-lg"
  };
  
  $: className = twMerge(baseStyles, variants[variant], sizes[size], classes);
</script>

<button {type} {disabled} class={className} on:click>
  <slot />
</button>