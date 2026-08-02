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
        return { title: "Forum", token, categories: [], forumTags: [], selectedForumTag: null };
    }

    const categories = data.data;

    // Fetch the user's forum tags and current selected tag
    let forumTags = [];
    let selectedForumTag = null;
    const tagsRes = await fetch(`${config.api}/forum/tags/my`, {
        headers: {
            'Accept': 'application/json',
            Authorization: `Bearer ${token}`
        }
    });
    if (tagsRes.ok) {
        const tagsJson = await tagsRes.json();
        forumTags = tagsJson.data || [];
        console.log(forumTags.length);
    } else {
        console.log(await tagsRes.json);
    }

    return {
        title: "Forum", token, categories, forumTags
    };
}
