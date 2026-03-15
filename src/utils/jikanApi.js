const BASE_URL = 'https://api.jikan.moe/v4';

export const fetchTopAnime = async () => {
    try {
        // Strict ratings for kids: g, pg, pg13
        const response = await fetch(`${BASE_URL}/top/anime?rating=pg13&limit=20`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching top anime:', error);
        return [];
    }
};

export const searchAnime = async (query) => {
    try {
        const response = await fetch(`${BASE_URL}/anime?q=${query}&rating=g,pg,pg13&limit=10`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error searching anime:', error);
        return [];
    }
};

export const fetchRecommendations = async (id) => {
    try {
        const response = await fetch(`${BASE_URL}/anime/${id}/recommendations`);
        const data = await response.json();
        return data.data.map(rec => rec.entry);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        return [];
    }
};
