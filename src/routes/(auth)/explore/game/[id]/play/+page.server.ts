import type { PageLoad } from './$types';

// Exposes `params` on the `data` prop, so +page.svelte can read
// `data.params.id` to know which game/world to connect to.
export const load: PageLoad = ({ params }) => {
	return { params };
};
