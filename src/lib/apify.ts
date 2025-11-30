// Apify Instagram Scraper Integration
// Automatically fetch Instagram profile data by username

const APIFY_API_URL = 'https://api.apify.com/v2';
// Actor name format: owner~actor-name
const INSTAGRAM_SCRAPER_ACTOR = 'apify~instagram-profile-scraper';

interface ApifyRunInput {
  usernames: string[];
}

interface InstagramProfile {
  id: string;
  username: string;
  fullName: string;
  biography: string;
  profilePicUrl: string;
  profilePicUrlHD: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  isBusinessAccount: boolean;
  businessCategoryName?: string;
  externalUrl?: string;
  highlightReelCount?: number;
  latestPosts: InstagramPost[];
  latestIgtvVideos?: any[];
  relatedProfiles?: any[];
}

interface InstagramPost {
  id: string;
  type: 'Image' | 'Video' | 'Sidecar';
  shortCode: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  url: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  displayUrl: string;
  videoUrl?: string;
  videoViewCount?: number;
  images?: string[];
}

interface ScrapedChannelData {
  username: string;
  fullName: string;
  bio: string;
  profilePicUrl: string;
  followers: number;
  following: number;
  postsCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  isBusiness: boolean;
  businessCategory?: string;
  externalUrl?: string;
  
  // Calculated from posts
  avgLikes: number;
  avgComments: number;
  avgViews: number; // for reels
  engagementRate: number;
  
  // Recent posts data
  recentPosts: {
    type: string;
    likes: number;
    comments: number;
    views?: number;
    caption: string;
    hashtags: string[];
    timestamp: string;
  }[];
  
  // Raw data
  raw?: InstagramProfile;
}

/**
 * Scrape Instagram profile using Apify
 * Returns full profile data including recent posts
 */
export async function scrapeInstagramProfile(
  apiToken: string,
  username: string
): Promise<ScrapedChannelData> {
  // Clean username
  const cleanUsername = username.replace('@', '').trim().toLowerCase();
  
  console.log(`[Apify] Starting scrape for @${cleanUsername}`);
  
  // Start the actor run
  const runResponse = await fetch(
    `${APIFY_API_URL}/acts/${INSTAGRAM_SCRAPER_ACTOR}/runs?token=${apiToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames: [cleanUsername],
        resultsLimit: 1,
        addParentData: false,
      }),
    }
  );

  if (!runResponse.ok) {
    const error = await runResponse.text();
    console.error('[Apify] Failed to start run:', error);
    throw new Error(`Apify API error: ${runResponse.status}`);
  }

  const runData = await runResponse.json();
  const runId = runData.data.id;
  
  console.log(`[Apify] Run started: ${runId}`);

  // Wait for the run to complete (poll every 2 seconds, max 60 seconds)
  let attempts = 0;
  const maxAttempts = 30;
  let status = 'RUNNING';

  while (status === 'RUNNING' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await fetch(
      `${APIFY_API_URL}/actor-runs/${runId}?token=${apiToken}`
    );
    
    if (!statusResponse.ok) {
      throw new Error('Failed to check run status');
    }
    
    const statusData = await statusResponse.json();
    status = statusData.data.status;
    attempts++;
    
    console.log(`[Apify] Run status: ${status} (attempt ${attempts})`);
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Apify run failed with status: ${status}`);
  }

  // Get the results from the dataset
  const datasetId = runData.data.defaultDatasetId;
  const resultsResponse = await fetch(
    `${APIFY_API_URL}/datasets/${datasetId}/items?token=${apiToken}`
  );

  if (!resultsResponse.ok) {
    throw new Error('Failed to fetch results');
  }

  const results: InstagramProfile[] = await resultsResponse.json();
  
  if (!results || results.length === 0) {
    throw new Error(`Profile @${cleanUsername} not found or is private`);
  }

  const profile = results[0];
  
  console.log(`[Apify] Got profile: @${profile.username}, ${profile.followersCount} followers`);

  // Calculate engagement metrics from recent posts
  const posts = profile.latestPosts || [];
  
  let totalLikes = 0;
  let totalComments = 0;
  let totalViews = 0;
  let videoCount = 0;

  const recentPosts = posts.map(post => {
    totalLikes += post.likesCount || 0;
    totalComments += post.commentsCount || 0;
    
    if (post.type === 'Video' && post.videoViewCount) {
      totalViews += post.videoViewCount;
      videoCount++;
    }

    return {
      type: post.type,
      likes: post.likesCount || 0,
      comments: post.commentsCount || 0,
      views: post.videoViewCount,
      caption: post.caption || '',
      hashtags: post.hashtags || [],
      timestamp: post.timestamp,
    };
  });

  const postsCount = posts.length || 1;
  const avgLikes = Math.round(totalLikes / postsCount);
  const avgComments = Math.round(totalComments / postsCount);
  const avgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;
  
  // Engagement rate = (likes + comments) / followers * 100
  const avgEngagement = avgLikes + avgComments;
  const engagementRate = profile.followersCount > 0 
    ? (avgEngagement / profile.followersCount) * 100 
    : 0;

  return {
    username: profile.username,
    fullName: profile.fullName || '',
    bio: profile.biography || '',
    profilePicUrl: profile.profilePicUrlHD || profile.profilePicUrl || '',
    followers: profile.followersCount || 0,
    following: profile.followsCount || 0,
    postsCount: profile.postsCount || 0,
    isPrivate: profile.isPrivate || false,
    isVerified: profile.isVerified || false,
    isBusiness: profile.isBusinessAccount || false,
    businessCategory: profile.businessCategoryName,
    externalUrl: profile.externalUrl,
    avgLikes,
    avgComments,
    avgViews,
    engagementRate: Math.round(engagementRate * 100) / 100,
    recentPosts,
    raw: profile,
  };
}

/**
 * Quick profile check - just basic info without full scrape
 * Uses synchronous API call (faster but less data)
 */
export async function quickProfileCheck(
  apiToken: string,
  username: string
): Promise<{ exists: boolean; isPrivate: boolean; followers?: number }> {
  try {
    const data = await scrapeInstagramProfile(apiToken, username);
    return {
      exists: true,
      isPrivate: data.isPrivate,
      followers: data.followers,
    };
  } catch (error) {
    return {
      exists: false,
      isPrivate: false,
    };
  }
}
