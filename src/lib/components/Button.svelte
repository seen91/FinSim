<script lang="ts">
  import { twMerge } from "tailwind-merge";
  
  export let type: "button" | "submit" | "reset" = "button";
  export let variant: "primary" | "secondary" | "outline" | "danger" | "success" = "primary";
  export let size: "sm" | "md" | "lg" = "md";
  export let disabled = false;
  export let fullWidth = false;
  export let classes = "";
  
  const baseStyles = "font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-400",
    outline: "bg-transparent border border-gray-300 hover:bg-gray-100 text-gray-800",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-5 py-2.5 text-lg"
  };
  
  const disabledClasses = "opacity-60 cursor-not-allowed";
  const widthClass = fullWidth ? "w-full" : "";
  
  $: className = twMerge(baseStyles, variants[variant], sizes[size], disabled ? disabledClasses : "", widthClass, classes);
</script>

<button 
  {type} 
  {disabled} 
  class={className} 
  on:click
  on:mouseover
  on:mouseenter
  on:mouseleave
  on:focus
  on:blur
>
  <slot>Button</slot>
</button>