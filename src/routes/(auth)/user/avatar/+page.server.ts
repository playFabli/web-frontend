import type { PageServerLoad } from './$types';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const token = cookies.get('token');

	// Fetch user's inventory with pagination
	let inventory: any[] = [];
	let avatarColors: any = null;
	let wearing: any[] = [];
	
	try {
		const invRes = await fetch(`${config.internalApi}/user/inventory/me?page=1&limit=20&show_duplicates=0`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		const invData = await invRes.json();
		if (invRes.ok) {
			inventory = invData.data || [];
		}
	} catch (e) {
		console.error('Failed to load inventory', e);
	}

	// Fetch avatar colors
	try {
		const colorsRes = await fetch(`${config.internalApi}/user/avatar/colors`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		const colorsData = await colorsRes.json();
		if (colorsRes.ok) {
			avatarColors = colorsData.data || null;
		}
	} catch (e) {
		console.error('Failed to load avatar colors', e);
	}

	// Fetch currently wearing items
	try {
		const wearingRes = await fetch(`${config.internalApi}/user/avatar/wearing`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		const wearingData = await wearingRes.json();
		if (wearingRes.ok) {
			wearing = wearingData.data || [];
		}
	} catch (e) {
		console.error('Failed to load wearing items', e);
	}

	return { title: `Customize Avatar`, token, inventory, avatarColors, wearing };
};