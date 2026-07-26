import { config } from "$lib/config";

export async function load({ cookies }) {
    const token = cookies.get('token') || null;
    const response = await fetch(`${config.internalApi}/forum/categories`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();
    if (!response.ok) {
        console.error(data?.message || 'Failed to fetch categories.');
        return [];
    }

    const categories = data.data;


    return {
        title: "Forum", token, categories
    };
}