<script lang="ts">
	import { goto, invalidateAll } from "$app/navigation";
	import { config } from "$lib/config";
	import { onMount } from "svelte";
	const RECAPTCHA_KEY = config.recaptchaSiteKey;

	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirm = $state('');
	let error = $state('');
	let success = $state('');
	let loading = $state(false);
	let recaptchaReady = $state(false);

	let recaptchaPromise: Promise<void> | null = null;

	function loadRecaptcha(): Promise<void> {
		if (recaptchaPromise) {
			return recaptchaPromise;
		}

		recaptchaPromise = new Promise((resolve, reject) => {
			if (!RECAPTCHA_KEY) {
				reject(new Error('Missing reCAPTCHA site key.'));
				return;
			}

			if (typeof window === 'undefined') {
				reject(new Error('reCAPTCHA cannot run during SSR.'));
				return;
			}

			// Already loaded
			if (
				window.grecaptcha &&
				typeof window.grecaptcha.execute === 'function'
			) {
				window.grecaptcha.ready(() => {
					recaptchaReady = true;
					resolve();
				});
				return;
			}

			// Global callback required by Google
			(window as any).onRecaptchaLoadCallback = () => {
				if (!window.grecaptcha) {
					reject(new Error('reCAPTCHA failed to initialize.'));
					return;
				}

				window.grecaptcha.ready(() => {
					recaptchaReady = true;
					resolve();
				});
			};

			const existing = document.querySelector(
				'script[src*="recaptcha/api.js"]'
			);

			if (existing) {
				return;
			}

			const script = document.createElement('script');

			script.src =
				`https://www.google.com/recaptcha/api.js` +
				`?render=${encodeURIComponent(RECAPTCHA_KEY)}` +
				`&onload=onRecaptchaLoadCallback`;

			script.async = true;
			script.defer = true;

			script.onerror = () => {
				reject(new Error('Failed to load reCAPTCHA script.'));
			};

			document.head.appendChild(script);
		});

		return recaptchaPromise;
	}


	onMount(() => {
		loadRecaptcha().catch((err) => {
			console.error('reCAPTCHA init error:', err);
		});

		return () => {
			delete (window as any).onRecaptchaLoadCallback;
		};
	});


	async function getRecaptchaToken(): Promise<string> {
		if (!RECAPTCHA_KEY) {
			throw new Error('Missing reCAPTCHA site key.');
		}

		await loadRecaptcha();

		if (
			typeof window === 'undefined' ||
			!window.grecaptcha ||
			typeof window.grecaptcha.execute !== 'function'
		) {
			throw new Error('reCAPTCHA is unavailable.');
		}

		const token = await window.grecaptcha.execute(RECAPTCHA_KEY, {
			action: 'register'
		});

		if (!token) {
			throw new Error('Failed to generate reCAPTCHA token.');
		}

		return token;
	}



	const handleSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		error = '';
		success = '';

		if (password !== confirm) {
			error = 'Passwords do not match.';
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters.';
			return;
		}

		if (!recaptchaReady) {
			error = 'Security check is loading. Please wait a brief moment and submit again.';
			return;
		}

		loading = true;
		try {
			// Rejection here will jump straight to the catch block below
			const token = await getRecaptchaToken();

			const response = await fetch(`${config.api}/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
				body: JSON.stringify({ username, email, password, recaptcha_token: token })
			});

			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				error = data.message || 'Registration failed. Please try again.';
			} else {
				document.cookie = `token=${encodeURIComponent(data.token)}; path=/; max-age=604800; Secure; SameSite=Strict`;

				success = 'Account created successfully!';
				username = '';
				email = '';
				password = '';
				confirm = '';

				await goto("/user/homepage");
				await invalidateAll();
			}
		} catch (err: any) {
			// Catching the explicit token error message vs general network failure
			error = err.message || 'Unable to submit registration. Please check your network connection or try again.';
		} finally {
			loading = false;
		}
	};
</script>
<main class="py-8">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="register-container">
			<div class="text-center mb-5">
				<h1 class="text-2xl font-bold text-gray-900">Join Fabli</h1>
				<p class="text-sm text-gray-600 mt-1">Create your account and start building today.</p>
			</div>

			<div class="border border-[#EFE6E2] rounded-lg p-5 bg-white">
				<form onsubmit={handleSubmit}>
					{#if error}
						<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{error}
						</div>
					{/if}
					{#if success}
						<div class="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
							{success}
						</div>
					{/if}
					<div class="mb-3">
						<label class="form-label" for="username">Username</label>
						<input type="text" id="username" class="form-input" placeholder="Pick a username" bind:value={username} required>
					</div>
					<div class="mb-3">
						<label class="form-label" for="email">Email</label>
						<input type="email" id="email" class="form-input" placeholder="you@example.com" bind:value={email} required>
					</div>
					<div class="mb-3">
						<label class="form-label" for="password">Password</label>
						<input type="password" id="password" class="form-input" placeholder="At least 8 characters" bind:value={password} required>
					</div>
					<div class="mb-4">
						<label class="form-label" for="confirm">Confirm Password</label>
						<input type="password" id="confirm" class="form-input" placeholder="Re-enter password" bind:value={confirm} required>
					</div>
					<div class="mb-4 flex items-start gap-2">
						<input type="checkbox" id="terms" class="mt-0.5 rounded-lg border-gray-300 text-primary focus:ring-primary" required>
						<label for="terms" class="text-xs text-gray-600 leading-tight">
							I agree to the <a href="#" class="text-primary hover:underline">Terms of Service</a> and <a href="#" class="text-primary hover:underline">Privacy Policy</a>.
						</label>
					</div>
					<button type="submit" class="btn-glossy w-full py-2 text-sm" disabled={loading}>
						{#if loading}
							Creating Account...
						{:else}
							Create Account
						{/if}
					</button>
				</form>
				<div class="mt-4 text-center text-sm text-gray-600">
					Already have an account? <a href="/user/login" class="text-primary hover:underline font-bold">Log in</a>
				</div>
			</div>
		</div>
	</div>
</main>