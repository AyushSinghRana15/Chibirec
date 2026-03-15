import _ from 'lodash';

const getUniqueTags = (pool) => {
    const allTags = pool.flatMap(anime => 
        anime.Tags ? anime.Tags.split(',').map(t => t.trim()) : []
    );
    return _.uniq(allTags);
};

export const vectorize = (anime, uniqueTags) => {
    const tags = anime.Tags ? anime.Tags.split(',').map(t => t.trim()) : [];
    return uniqueTags.map(tag => tags.includes(tag) ? 1 : 0);
};

export const calculateCosineSimilarity = (vecA, vecB) => {
    const dotProduct = _.sum(vecA.map((val, i) => val * vecB[i]));
    const magnitudeA = Math.sqrt(_.sum(vecA.map(val => val * val)));
    const magnitudeB = Math.sqrt(_.sum(vecB.map(val => val * val)));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
};

export const getRecommendations = (likedAnime, pool) => {
    if (!likedAnime || likedAnime.length === 0) return _.sampleSize(pool, 24);

    const uniqueTags = getUniqueTags(pool);
    const userVectors = likedAnime.map(a => vectorize(a, uniqueTags));
    
    // Composite user profile
    const userProfile = userVectors[0].map((val, i) => 
        _.mean(userVectors.map(v => v[i]))
    );

    const scoredPool = pool.map(anime => ({
        ...anime,
        score: calculateCosineSimilarity(userProfile, vectorize(anime, uniqueTags))
    }));

    const filteredPool = scoredPool.filter(a => !likedAnime.some(la => la.Name === a.Name));
    return _.orderBy(filteredPool, ['score'], ['desc']).slice(0, 24);
};
