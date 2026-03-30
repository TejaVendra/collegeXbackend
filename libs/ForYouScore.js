export const forYouScore = (post,currentUser) =>{

    const now = Date.now();

    //bases
    const likes = post.likes?.length || 0;
    const comments = post.comments?.length || 0;

    let engagement = (likes*3.0) + (comments*5.0);

    // User specified

    const userLiked = post.likes?.includes(currentUser._id);
    const userCommented = post.comments?.some(c => c.user === currentUser._id);

    if(userLiked) engagement+=30;
    if(userCommented) engagement+=50;

    const ageHours = (now - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
    const recencyDecay = 1 / (1 + Math.pow(ageHours / 24, 1.5));

    let similarity = 0;
    if (currentUser.following?.includes(post.author)) {
        similarity += 0.6;
    }
   const finalScore = engagement * recencyDecay * (1 + similarity);

   return finalScore;
}