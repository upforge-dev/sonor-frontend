// src/stores/broadcastStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import portalApi from '@/lib/sonor-api';

// ============================================================================
// TYPES
// ============================================================================

/**
 * @typedef {'facebook' | 'instagram' | 'linkedin' | 'gbp' | 'tiktok'} SocialPlatform
 * @typedef {'draft' | 'pending_approval' | 'scheduled' | 'publishing' | 'published' | 'partial' | 'failed'} PostStatus
 * @typedef {'pending' | 'approved' | 'rejected' | 'changes_requested'} ApprovalStatus
 * @typedef {'active' | 'expired' | 'revoked' | 'error'} ConnectionStatus
 * @typedef {'day' | 'week' | 'month'} CalendarViewType
 */

/**
 * @typedef {Object} SocialPost
 * @property {string} id
 * @property {string} projectId
 * @property {SocialPlatform[]} platforms
 * @property {string} content
 * @property {Object.<string, string>} [contentVariants]
 * @property {Array} [media]
 * @property {string[]} [hashtags]
 * @property {string} [linkUrl]
 * @property {string} [scheduledFor]
 * @property {PostStatus} status
 * @property {ApprovalStatus} [approvalStatus]
 * @property {Object} [platformResults]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} PlatformConnection
 * @property {string} id
 * @property {string} projectId
 * @property {SocialPlatform} platform
 * @property {string} platformAccountId
 * @property {string} [platformAccountName]
 * @property {string} [platformAvatarUrl]
 * @property {ConnectionStatus} status
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Template
 * @property {string} id
 * @property {string} projectId
 * @property {string} name
 * @property {string} content
 * @property {string} [category]
 * @property {SocialPlatform[]} [platforms]
 * @property {number} useCount
 * @property {string} createdAt
 */

// ============================================================================
// STORE
// ============================================================================

const initialState = {
  // Posts
  posts: [],
  postsLoading: false,
  postsTotal: 0,
  currentPost: null,
  
  // Calendar
  calendarData: null,
  calendarView: 'month',
  calendarDate: new Date().toISOString().split('T')[0],
  calendarLoading: false,
  
  // Connections
  connections: [],
  connectionsLoading: false,
  
  // Templates
  templates: [],
  templatesLoading: false,
  
  // Hashtag sets
  hashtagSets: [],
  hashtagSetsLoading: false,
  
  // Inbox
  inboxMessages: [],
  inboxLoading: false,
  inboxTotal: 0,
  inboxUnreadCount: 0,
  selectedMessage: null,
  
  // Analytics
  analytics: null,
  analyticsLoading: false,
  analyticsPeriod: '7d',
  
  // AI Images
  aiImages: [],
  aiImagesLoading: false,
  
  // Composer state
  composerOpen: false,
  composerMode: 'create', // 'create' | 'edit' | 'duplicate'
  composerPost: null,
  
  // Filters
  filters: {
    status: null,
    platform: null,
    dateRange: null,
  },
  
  // Inbox filters
  inboxFilters: {
    platform: null,
    type: null,
    status: 'unread',
  },
  
  // Error handling
  error: null,
};

export const useBroadcastStore = create(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================================================
      // POSTS
      // ========================================================================

      fetchPosts: async (projectId, options = {}) => {
        set({ postsLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (options.status) params.append('status', options.status);
          if (options.platform) params.append('platform', options.platform);
          if (options.page) params.append('page', options.page);
          if (options.limit) params.append('limit', options.limit);

          const response = await portalApi.get(
            `/broadcast/projects/${projectId}/posts?${params}`
          );
          
          set({
            posts: response.data.posts,
            postsTotal: response.data.total,
            postsLoading: false,
          });
        } catch (error) {
          set({ error: error.message, postsLoading: false });
        }
      },

      getPost: async (postId) => {
        set({ postsLoading: true, error: null });
        try {
          const response = await portalApi.get(`/broadcast/posts/${postId}`);
          set({ currentPost: response.data, postsLoading: false });
          return response.data;
        } catch (error) {
          set({ error: error.message, postsLoading: false });
          throw error;
        }
      },

      createPost: async (projectId, postData) => {
        set({ postsLoading: true, error: null });
        try {
          const response = await portalApi.post(
            `/broadcast/projects/${projectId}/posts`,
            postData
          );
          
          // Add to posts list
          set((state) => ({
            posts: [response.data, ...state.posts],
            postsTotal: state.postsTotal + 1,
            postsLoading: false,
            composerOpen: false,
            composerPost: null,
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message, postsLoading: false });
          throw error;
        }
      },

      updatePost: async (postId, updates) => {
        set({ postsLoading: true, error: null });
        try {
          const response = await portalApi.put(
            `/broadcast/posts/${postId}`,
            updates
          );
          
          // Update in posts list
          set((state) => ({
            posts: state.posts.map((p) =>
              p.id === postId ? response.data : p
            ),
            currentPost:
              state.currentPost?.id === postId ? response.data : state.currentPost,
            postsLoading: false,
            composerOpen: false,
            composerPost: null,
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message, postsLoading: false });
          throw error;
        }
      },

      deletePost: async (postId) => {
        set({ postsLoading: true, error: null });
        try {
          await portalApi.delete(`/broadcast/posts/${postId}`);
          
          set((state) => ({
            posts: state.posts.filter((p) => p.id !== postId),
            postsTotal: state.postsTotal - 1,
            postsLoading: false,
          }));
        } catch (error) {
          set({ error: error.message, postsLoading: false });
          throw error;
        }
      },

      duplicatePost: async (postId) => {
        set({ postsLoading: true, error: null });
        try {
          const response = await portalApi.post(
            `/broadcast/posts/${postId}/duplicate`
          );
          
          set((state) => ({
            posts: [response.data, ...state.posts],
            postsTotal: state.postsTotal + 1,
            postsLoading: false,
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message, postsLoading: false });
          throw error;
        }
      },

      reschedulePost: async (postId, scheduledFor, timezone) => {
        set({ postsLoading: true, error: null });
        try {
          const response = await portalApi.patch(
            `/broadcast/posts/${postId}/schedule`,
            { scheduledFor, timezone }
          );
          
          set((state) => ({
            posts: state.posts.map((p) =>
              p.id === postId ? response.data : p
            ),
            postsLoading: false,
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message, postsLoading: false });
          throw error;
        }
      },

      // ========================================================================
      // APPROVAL WORKFLOW
      // ========================================================================

      approvePost: async (postId, notes) => {
        try {
          const response = await portalApi.post(
            `/broadcast/posts/${postId}/approve`,
            { notes }
          );
          
          set((state) => ({
            posts: state.posts.map((p) =>
              p.id === postId ? response.data : p
            ),
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      rejectPost: async (postId, reason) => {
        try {
          const response = await portalApi.post(
            `/broadcast/posts/${postId}/reject`,
            { reason }
          );
          
          set((state) => ({
            posts: state.posts.map((p) =>
              p.id === postId ? response.data : p
            ),
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      requestChanges: async (postId, feedback) => {
        try {
          const response = await portalApi.post(
            `/broadcast/posts/${postId}/request-changes`,
            { feedback }
          );
          
          set((state) => ({
            posts: state.posts.map((p) =>
              p.id === postId ? response.data : p
            ),
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      // ========================================================================
      // PUBLISHING
      // ========================================================================

      publishPost: async (postId) => {
        try {
          const response = await portalApi.post(
            `/broadcast/posts/${postId}/publish`
          );
          
          set((state) => ({
            posts: state.posts.map((p) =>
              p.id === postId
                ? { ...p, status: response.data.overallSuccess ? 'published' : 'partial' }
                : p
            ),
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      retryFailedPlatforms: async (postId) => {
        try {
          const response = await portalApi.post(
            `/broadcast/posts/${postId}/retry`
          );
          
          set((state) => ({
            posts: state.posts.map((p) =>
              p.id === postId
                ? { ...p, status: response.data.overallSuccess ? 'published' : 'partial' }
                : p
            ),
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      // ========================================================================
      // CALENDAR
      // ========================================================================

      fetchCalendar: async (projectId, options = {}) => {
        set({ calendarLoading: true, error: null });
        try {
          const { calendarView, calendarDate } = get();
          const params = new URLSearchParams();
          params.append('view', options.view || calendarView);
          if (options.startDate) params.append('startDate', options.startDate);
          if (options.endDate) params.append('endDate', options.endDate);
          if (options.platforms) params.append('platforms', options.platforms.join(','));
          if (options.statuses) params.append('statuses', options.statuses.join(','));

          const response = await portalApi.get(
            `/broadcast/projects/${projectId}/calendar?${params}`
          );
          
          set({
            calendarData: response.data,
            calendarLoading: false,
          });
        } catch (error) {
          set({ error: error.message, calendarLoading: false });
        }
      },

      setCalendarView: (view) => set({ calendarView: view }),

      setCalendarDate: (date) => set({ calendarDate: date }),

      getOptimalTimes: async (projectId, platforms, date) => {
        try {
          const params = new URLSearchParams();
          params.append('platforms', platforms.join(','));
          params.append('date', date);

          const response = await portalApi.get(
            `/broadcast/projects/${projectId}/optimal-times?${params}`
          );
          
          return response.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      // ========================================================================
      // CONNECTIONS
      // ========================================================================

      fetchConnections: async (projectId) => {
        set({ connectionsLoading: true, error: null });
        try {
          const response = await portalApi.get(
            `/broadcast/projects/${projectId}/connections`
          );
          
          set({
            connections: response.data,
            connectionsLoading: false,
          });
        } catch (error) {
          set({ error: error.message, connectionsLoading: false });
        }
      },

      initiateOAuth: async (projectId, platform, returnUrl) => {
        try {
          const params = new URLSearchParams();
          params.append('projectId', projectId);
          params.append('modules', 'broadcast'); // Use unified OAuth with broadcast module
          if (returnUrl) {
            params.append('returnUrl', returnUrl);
          } else {
            // Default return URL for broadcast settings
            params.append('returnUrl', `${window.location.origin}/broadcast?connected=1`);
          }

          const response = await portalApi.get(
            `/oauth/initiate/${platform}?${params}`
          );
          
          // Redirect to OAuth URL
          window.location.href = response.data.url;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      disconnectPlatform: async (connectionId, revokeTokens = false) => {
        set({ connectionsLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (revokeTokens) params.append('revokeTokens', 'true');

          await portalApi.delete(
            `/broadcast/connections/${connectionId}?${params}`
          );
          
          set((state) => ({
            connections: state.connections.filter((c) => c.id !== connectionId),
            connectionsLoading: false,
          }));
        } catch (error) {
          set({ error: error.message, connectionsLoading: false });
          throw error;
        }
      },

      refreshConnection: async (connectionId) => {
        try {
          await portalApi.post(
            `/broadcast/connections/${connectionId}/refresh`
          );
          
          // Refetch connections to get updated status
          const { connections } = get();
          if (connections.length > 0) {
            const projectId = connections[0].projectId;
            get().fetchConnections(projectId);
          }
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      // ========================================================================
      // TEMPLATES
      // ========================================================================

      fetchTemplates: async (projectId, options = {}) => {
        set({ templatesLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (options.category) params.append('category', options.category);
          if (options.platform) params.append('platform', options.platform);
          if (options.search) params.append('search', options.search);

          const response = await portalApi.get(
            `/broadcast/projects/${projectId}/templates?${params}`
          );
          
          set({
            templates: response.data,
            templatesLoading: false,
          });
        } catch (error) {
          set({ error: error.message, templatesLoading: false });
        }
      },

      createTemplate: async (projectId, templateData) => {
        set({ templatesLoading: true, error: null });
        try {
          const response = await portalApi.post(
            `/broadcast/projects/${projectId}/templates`,
            templateData
          );
          
          set((state) => ({
            templates: [response.data, ...state.templates],
            templatesLoading: false,
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message, templatesLoading: false });
          throw error;
        }
      },

      deleteTemplate: async (templateId) => {
        set({ templatesLoading: true, error: null });
        try {
          await portalApi.delete(`/broadcast/templates/${templateId}`);
          
          set((state) => ({
            templates: state.templates.filter((t) => t.id !== templateId),
            templatesLoading: false,
          }));
        } catch (error) {
          set({ error: error.message, templatesLoading: false });
          throw error;
        }
      },

      // ========================================================================
      // HASHTAG SETS
      // ========================================================================

      fetchHashtagSets: async (projectId, category) => {
        set({ hashtagSetsLoading: true, error: null });
        try {
          const params = category ? `?category=${encodeURIComponent(category)}` : '';
          const response = await portalApi.get(
            `/broadcast/projects/${projectId}/hashtags${params}`
          );
          
          set({
            hashtagSets: response.data,
            hashtagSetsLoading: false,
          });
        } catch (error) {
          set({ error: error.message, hashtagSetsLoading: false });
        }
      },

      createHashtagSet: async (projectId, data) => {
        try {
          const response = await portalApi.post(
            `/broadcast/projects/${projectId}/hashtags`,
            data
          );
          
          set((state) => ({
            hashtagSets: [response.data, ...state.hashtagSets],
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      deleteHashtagSet: async (setId) => {
        try {
          await portalApi.delete(`/broadcast/hashtags/${setId}`);
          
          set((state) => ({
            hashtagSets: state.hashtagSets.filter((s) => s.id !== setId),
          }));
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      suggestHashtags: async (projectId, content, platform, limit = 30) => {
        try {
          const response = await portalApi.post(
            `/broadcast/projects/${projectId}/hashtags/suggest`,
            { content, platform, limit }
          );
          
          return response.data.hashtags || [];
        } catch (error) {
          set({ error: error.message });
          return [];
        }
      },

      // ========================================================================
      // INBOX
      // ========================================================================

      fetchInbox: async (projectId, filters = {}) => {
        set({ inboxLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (filters.platform) params.append('platform', filters.platform);
          if (filters.type) params.append('type', filters.type);
          if (filters.status) params.append('status', filters.status);
          if (filters.limit) params.append('limit', filters.limit);
          if (filters.offset) params.append('offset', filters.offset);

          const response = await portalApi.get(
            `/broadcast/projects/${projectId}/inbox?${params}`
          );
          
          set({
            inboxMessages: response.data.messages || response.data,
            inboxTotal: response.data.total || 0,
            inboxUnreadCount: response.data.unreadCount || 0,
            inboxLoading: false,
          });
        } catch (error) {
          set({ error: error.message, inboxLoading: false });
        }
      },

      markMessageAsRead: async (messageId) => {
        try {
          await portalApi.patch(`/broadcast/inbox/${messageId}/read`);
          
          set((state) => ({
            inboxMessages: state.inboxMessages.map((m) =>
              m.id === messageId ? { ...m, status: 'read', readAt: new Date().toISOString() } : m
            ),
            inboxUnreadCount: Math.max(0, state.inboxUnreadCount - 1),
          }));
        } catch (error) {
          set({ error: error.message });
        }
      },

      archiveMessage: async (messageId) => {
        try {
          await portalApi.patch(`/broadcast/inbox/${messageId}/archive`);
          
          set((state) => ({
            inboxMessages: state.inboxMessages.map((m) =>
              m.id === messageId ? { ...m, status: 'archived' } : m
            ),
          }));
        } catch (error) {
          set({ error: error.message });
        }
      },

      replyToMessage: async (messageId, content) => {
        try {
          const response = await portalApi.post(
            `/broadcast/inbox/${messageId}/reply`,
            { content }
          );
          
          set((state) => ({
            inboxMessages: state.inboxMessages.map((m) =>
              m.id === messageId ? { ...m, status: 'replied', repliedAt: new Date().toISOString() } : m
            ),
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      getSuggestedReply: async (messageId) => {
        try {
          const response = await portalApi.post(
            `/broadcast/inbox/${messageId}/suggest-reply`
          );
          return response.data.suggestion;
        } catch (error) {
          set({ error: error.message });
          return null;
        }
      },

      setSelectedMessage: (message) => set({ selectedMessage: message }),

      setInboxFilters: (filters) =>
        set((state) => ({ inboxFilters: { ...state.inboxFilters, ...filters } })),

      // ========================================================================
      // ANALYTICS
      // ========================================================================

      fetchAnalytics: async (projectId, period = '7d') => {
        set({ analyticsLoading: true, analyticsPeriod: period, error: null });
        try {
          const response = await portalApi.get(
            `/broadcast/projects/${projectId}/analytics?period=${period}`
          );
          
          set({
            analytics: response.data,
            analyticsLoading: false,
          });
        } catch (error) {
          set({ error: error.message, analyticsLoading: false });
        }
      },

      fetchPlatformAnalytics: async (projectId, platform, period = '7d') => {
        try {
          const response = await portalApi.get(
            `/broadcast/projects/${projectId}/analytics/${platform}?period=${period}`
          );
          return response.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      fetchTopPosts: async (projectId, period = '7d', limit = 10) => {
        try {
          const response = await portalApi.get(
            `/broadcast/projects/${projectId}/analytics/top-posts?period=${period}&limit=${limit}`
          );
          return response.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      // ========================================================================
      // AI IMAGES
      // ========================================================================

      fetchAiImages: async (projectId, limit = 50) => {
        set({ aiImagesLoading: true, error: null });
        try {
          const response = await portalApi.get(
            `/broadcast/projects/${projectId}/images?limit=${limit}`
          );
          
          set({
            aiImages: response.data,
            aiImagesLoading: false,
          });
        } catch (error) {
          set({ error: error.message, aiImagesLoading: false });
        }
      },

      generateImages: async (projectId, prompt, options = {}) => {
        set({ aiImagesLoading: true, error: null });
        try {
          const response = await portalApi.post(
            `/broadcast/projects/${projectId}/images/generate`,
            {
              prompt,
              aspectRatio: options.aspectRatio || '1:1',
              style: options.style || 'realistic',
              count: options.count || 4,
            }
          );
          
          set((state) => ({
            aiImages: [...response.data, ...state.aiImages],
            aiImagesLoading: false,
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message, aiImagesLoading: false });
          throw error;
        }
      },

      checkImageStatus: async (imageId) => {
        try {
          const response = await portalApi.get(
            `/broadcast/images/${imageId}/status`
          );
          
          // Update image in list if status changed
          set((state) => ({
            aiImages: state.aiImages.map((img) =>
              img.id === imageId
                ? { ...img, status: response.data.status, imageUrl: response.data.imageUrl }
                : img
            ),
          }));
          
          return response.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      deleteAiImage: async (imageId) => {
        try {
          await portalApi.delete(`/broadcast/images/${imageId}`);
          
          set((state) => ({
            aiImages: state.aiImages.filter((img) => img.id !== imageId),
          }));
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      // ========================================================================
      // TRENDING SOUNDS
      // ========================================================================

      fetchTrendingSounds: async (platform = 'tiktok', region = 'US', limit = 20) => {
        set({ soundsLoading: true, error: null });
        try {
          const response = await portalApi.get(
            `/broadcast/sounds/trending?platform=${platform}&region=${region}&limit=${limit}`
          );
          
          set({
            trendingSounds: response.data,
            soundsLoading: false,
          });
        } catch (error) {
          set({ error: error.message, soundsLoading: false });
        }
      },

      searchSounds: async (query, platform = 'tiktok') => {
        set({ soundsLoading: true, error: null });
        try {
          const response = await portalApi.get(
            `/broadcast/sounds/search?q=${encodeURIComponent(query)}&platform=${platform}`
          );
          
          set({
            trendingSounds: response.data,
            soundsLoading: false,
          });
          
          return response.data;
        } catch (error) {
          set({ error: error.message, soundsLoading: false });
          return [];
        }
      },

      // ========================================================================
      // CAMPAIGNS (Multi-post scheduled campaigns)
      // ========================================================================

      createCampaign: async (projectId, campaignData) => {
        try {
          const response = await portalApi.post(
            `/broadcast/projects/${projectId}/campaigns`,
            campaignData
          );
          return response.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      // ========================================================================
      // COMPOSER
      // ========================================================================

      openComposer: (mode = 'create', post = null) =>
        set({ composerOpen: true, composerMode: mode, composerPost: post }),

      closeComposer: () =>
        set({ composerOpen: false, composerMode: 'create', composerPost: null }),

      // ========================================================================
      // FILTERS
      // ========================================================================

      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),

      clearFilters: () =>
        set({
          filters: {
            status: null,
            platform: null,
            dateRange: null,
          },
        }),

      // ========================================================================
      // ERROR HANDLING
      // ========================================================================

      clearError: () => set({ error: null }),

      // ========================================================================
      // RESET
      // ========================================================================

      reset: () => set(initialState),
    }),
    { name: 'broadcast-store' }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectPosts = (state) => state.posts;
export const selectPostsLoading = (state) => state.postsLoading;
export const selectCurrentPost = (state) => state.currentPost;
export const selectCalendarData = (state) => state.calendarData;
export const selectCalendarView = (state) => state.calendarView;
export const selectConnections = (state) => state.connections;
export const selectTemplates = (state) => state.templates;
export const selectComposerOpen = (state) => state.composerOpen;
export const selectError = (state) => state.error;

// Inbox selectors
export const selectInbox = (state) => state.inboxMessages;
export const selectInboxLoading = (state) => state.inboxLoading;
export const selectInboxUnreadCount = (state) => state.inboxUnreadCount;
export const selectSelectedMessage = (state) => state.selectedMessage;

// Analytics selectors
export const selectAnalytics = (state) => state.analytics;
export const selectAnalyticsLoading = (state) => state.analyticsLoading;
export const selectAnalyticsPeriod = (state) => state.analyticsPeriod;

// Hashtag selectors
export const selectHashtagSets = (state) => state.hashtagSets;
export const selectHashtagSetsLoading = (state) => state.hashtagSetsLoading;

// AI Images selectors
export const selectAiImages = (state) => state.aiImages;
export const selectAiImagesLoading = (state) => state.aiImagesLoading;

// Trending sounds selectors
export const selectTrendingSounds = (state) => state.trendingSounds;
export const selectSoundsLoading = (state) => state.soundsLoading;

// Connection helpers
export const selectConnectionsByPlatform = (state) => {
  const byPlatform = {};
  for (const conn of state.connections) {
    byPlatform[conn.platform] = conn;
  }
  return byPlatform;
};

export const selectConnectedPlatforms = (state) =>
  state.connections
    .filter((c) => c.status === 'active')
    .map((c) => c.platform);

// Post helpers
export const selectPostsByStatus = (status) => (state) =>
  state.posts.filter((p) => p.status === status);

export const selectPendingApprovals = (state) =>
  state.posts.filter((p) => p.approvalStatus === 'pending');

export const selectScheduledPosts = (state) =>
  state.posts.filter((p) => p.status === 'scheduled');

export default useBroadcastStore;
