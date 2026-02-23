/**
 * Hooks Barrel Export
 * 
 * Central export for all TanStack Query hooks.
 * Import from '@/lib/hooks' to get all hooks.
 * 
 * Usage:
 *   import { useProspects, useCreateProspect, crmKeys } from '@/lib/hooks'
 */

// ═══════════════════════════════════════════════════════════════════════════
// AFFILIATES
// ═══════════════════════════════════════════════════════════════════════════
export {
  affiliatesKeys,
  useAffiliates,
  useAffiliate,
  useCreateAffiliate,
  useUpdateAffiliate,
  useDeleteAffiliate,
  useAffiliateOffers,
  useAffiliateOffer,
  useCreateAffiliateOffer,
  useUpdateAffiliateOffer,
  useDeleteAffiliateOffer,
  useAffiliateClicks,
  useAffiliateConversions,
  useAffiliateStats,
  useRecordAffiliateConversion,
} from './use-affiliates'

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════
export {
  analyticsKeys,
  useAnalyticsOverview,
  useTopPages,
  usePageAnalytics,
  useJourneys,
  useSessions,
  useEvents,
  useAiInsights,
  useGenerateAiInsights,
  useRealtimeAnalytics,
} from './use-analytics'

// ═══════════════════════════════════════════════════════════════════════════
// BILLING
// ═══════════════════════════════════════════════════════════════════════════
export {
  billingKeys,
  useInvoices,
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useMarkInvoicePaid,
  useVoidInvoice,
  useSendInvoice,
  useSendInvoiceReminder,
  useSendReminder,
  useToggleRecurringPause,
  useBillingSummary,
  useOverdueInvoices,
  usePaymentMethods,
  useAddPaymentMethod,
  useRemovePaymentMethod,
} from './use-billing'

// ═══════════════════════════════════════════════════════════════════════════
// BROADCAST
// ═══════════════════════════════════════════════════════════════════════════
export {
  broadcastKeys,
  useBroadcastPosts,
  useBroadcastPost,
  useCreateBroadcastPost,
  useUpdateBroadcastPost,
  useDeleteBroadcastPost,
  usePublishBroadcastPost,
  useBroadcastCalendar,
  useBroadcastConnections,
  useConnectPlatform as useConnectBroadcastPlatform,
  useDisconnectPlatform as useDisconnectBroadcastPlatform,
  useBroadcastTemplates,
  useCreateBroadcastTemplate,
  useUpdateBroadcastTemplate,
  useDeleteBroadcastTemplate,
  useHashtagSets as useBroadcastHashtagSets,
  useCreateHashtagSet as useCreateBroadcastHashtagSet,
  useUpdateHashtagSet as useUpdateBroadcastHashtagSet,
  useDeleteHashtagSet as useDeleteBroadcastHashtagSet,
  useBroadcastInbox,
  useReplyToInbox as useReplyToBroadcastComment,
  useBroadcastAnalytics,
  useBroadcastDrafts,
  // AI Images
  useAiImages,
  useGenerateAiImages,
  useUpdateAiImage,
  useDeleteAiImage,
  // Media Library
  useMediaLibrary,
  useUploadMedia,
  useDeleteMedia,
} from './use-broadcast'

// ═══════════════════════════════════════════════════════════════════════════
// COMMERCE
// ═══════════════════════════════════════════════════════════════════════════
export {
  commerceKeys,
  useCommerceSettings,
  useUpdateCommerceSettings,
  getCommerceDashboard,
  useCommerceDashboard,
  useCategories as useCommerceCategories,
  useOfferings as useCommerceOfferings,
  useOffering as useCommerceOffering,
  useCreateOffering as useCreateCommerceOffering,
  useUpdateOffering as useUpdateCommerceOffering,
  useDeleteOffering as useDeleteCommerceOffering,
  useVariants as useCommerceVariants,
  useCreateVariant as useCreateCommerceVariant,
  useUpdateVariant as useUpdateCommerceVariant,
  useDeleteVariant as useDeleteCommerceVariant,
  useSchedules as useCommerceSchedules,
  useCreateSchedule as useCreateCommerceSchedule,
  useUpdateSchedule as useUpdateCommerceSchedule,
  useDeleteSchedule as useDeleteCommerceSchedule,
  useSales as useCommerceSales,
  useSale as useCommerceSale,
  useCreateSale as useCreateCommerceSale,
  useUpdateSale as useUpdateCommerceSale,
  useUploadOfferingImage as useUploadCommerceImage,
  useDeleteOfferingImage as useDeleteCommerceImage,
} from './use-commerce'

// ═══════════════════════════════════════════════════════════════════════════
// CRM
// ═══════════════════════════════════════════════════════════════════════════
export {
  crmKeys,
  useProspects,
  useProspect,
  useUpdateProspect,
  useBulkUpdateProspects,
  useConvertProspect,
  useCalls,
  useCall,
  useTasks,
  useUpdateTask,
  useFollowUps,
  useUpdateFollowUp,
  useCreateNote,
  useTimeline,
  useLogActivity,
  useAttribution,
  useAttributionStats,
  useTargetCompanies,
  useTargetCompany,
  useCreateTargetCompany,
  useUpdateTargetCompany,
  useClaimTargetCompany,
  useUnclaimTargetCompany,
  useCallPrep,
} from './use-crm'

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════════════════════
export {
  customersKeys,
  useCustomerStats,
  useCustomers,
  useCustomer,
  useCustomerPurchases,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useAddCustomerTag,
  useRemoveCustomerTag,
  useAddCustomerNote,
} from './use-customers'

// ═══════════════════════════════════════════════════════════════════════════
// DRIVE
// ═══════════════════════════════════════════════════════════════════════════
export {
  driveKeys,
  useDriveFiles,
  useCreateDriveFolder,
  useUploadDriveFile,
  useDeleteDriveFile,
  useRenameDriveFile,
  useMoveDriveFile,
} from './use-drive'

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL
// ═══════════════════════════════════════════════════════════════════════════
export {
  emailKeys,
  useEmailSettings,
  useUpdateEmailSettings,
  useEmailCampaigns,
  useEmailCampaign,
  useCreateEmailCampaign,
  useUpdateEmailCampaign,
  useDeleteEmailCampaign,
  useSendEmailCampaign,
  useScheduleEmailCampaign,
  useEmailTemplates,
  useSystemEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
  useEmailSubscribers,
  useCreateEmailSubscriber,
  useUpdateEmailSubscriber,
  useDeleteEmailSubscriber,
  useEmailLists,
  useCreateEmailList,
  useUpdateEmailList,
  useDeleteEmailList,
  useEmailAutomations,
  useEmailAutomation,
  useCreateEmailAutomation,
  useUpdateEmailAutomation,
  useToggleEmailAutomation,
  useDeleteEmailAutomation,
} from './use-email'

// ═══════════════════════════════════════════════════════════════════════════
// FILES
// ═══════════════════════════════════════════════════════════════════════════
export {
  filesKeys,
  useFiles,
  useFolders,
  useFileCategories,
  useUploadFile,
  useUploadMultipleFiles,
  useUpdateFile,
  useDeleteFile,
  useMoveFile,
  useCreateFolder,
  useDeleteFolder,
} from './use-files'

// ═══════════════════════════════════════════════════════════════════════════
// FORMS
// ═══════════════════════════════════════════════════════════════════════════
export {
  formsKeys,
  useForms,
  useForm,
  useCreateForm,
  useUpdateForm,
  useDeleteForm,
  useDuplicateForm,
  useSubmissions,
  useInfiniteSubmissions,
  useSubmission,
  useUpdateSubmissionStatus,
  useDeleteSubmission,
  useBulkUpdateSubmissions,
  useFormAnalytics,
} from './use-forms'

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════
export {
  notificationsKeys,
  useNewLeadsCount,
} from './use-notifications'

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════════════════
export {
  messagesKeys,
  useConversations,
  useMessagesContacts,
  useMessages,
  useUnreadMessagesCount,
  useSendMessage,
  useMarkMessageAsRead,
  useMarkConversationAsRead,
  useRefreshMessages,
  useEchoContact,
} from './use-messages'

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════════════════
export {
  projectsKeys,
  PROJECT_STATUS_CONFIG,
  CREATIVE_STATUS_CONFIG,
  TASK_STATUS_CONFIG,
  CREATIVE_REQUEST_TYPES,
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCreativeRequests,
  useCreateCreativeRequest,
  useUpdateCreativeRequest,
  useProjectTasks,
  useCreateTask as useCreateProjectTask,
  useUpdateTask as useUpdateProjectTask,
  useDeleteTask as useDeleteProjectTask,
  useTimeEntries,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  useProjectTimeSummary,
  useStartProjectTimer,
  useStopProjectTimer,
  usePendingApprovals,
  useApproveItem,
  useRejectItem,
  useRequestApprovalChanges,
} from './use-projects'

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTS V2 (Uptrade Tasks, User Tasks, Deliverables)
// ═══════════════════════════════════════════════════════════════════════════
export {
  UPTRADE_TASK_STATUS_CONFIG,
  UPTRADE_TASK_PRIORITY_CONFIG,
  UPTRADE_TASK_MODULE_CONFIG,
  USER_TASK_PRIORITY_CONFIG,
  DELIVERABLE_STATUS_CONFIG,
  DELIVERABLE_TYPE_CONFIG,
  priorityConfig,
  deliverableStatusConfig,
  deliverableTypeConfig,
  projectsV2Keys,
  useUptradeTasks,
  useUptradeTask,
  useUptradeTasksStats,
  useUptradeTasksUpcoming,
  useCreateUptradeTask,
  useUpdateUptradeTask,
  useCompleteUptradeTask,
  useDeleteUptradeTask,
  useAddUptradeTaskChecklistItem,
  useToggleUptradeTaskChecklistItem,
  useRemoveUptradeTaskChecklistItem,
  useUserTasks,
  useUserTasksStats,
  useUserTasksCategories,
  useCreateUserTask,
  useUpdateUserTask,
  useCompleteUserTask,
  useUncompleteUserTask,
  useDeleteUserTask,
  useMoveUserTaskToCategory,
  useDeliverables,
  useDeliverable,
  useDeliverablesStats,
  useDeliverablesPendingApprovals,
  useCreateDeliverable,
  useUpdateDeliverable,
  useDeleteDeliverable,
  useSubmitDeliverableForReview,
  useApproveDeliverable,
  useRequestDeliverableChanges,
  useDeliverDeliverable,
} from './use-projects-v2'

// ═══════════════════════════════════════════════════════════════════════════
// PROPOSALS
// ═══════════════════════════════════════════════════════════════════════════
export {
  proposalsKeys,
  useProposals,
  useProposal,
  useProposalTemplates,
  useCreateProposal,
  useUpdateProposal,
  useDeleteProposal,
  useSendProposal,
  useCloneProposal,
  useArchiveProposal,
  useRestoreProposal,
  useAcceptProposal,
  useDeclineProposal,
} from './use-proposals'

// ═══════════════════════════════════════════════════════════════════════════
// REPUTATION
// ═══════════════════════════════════════════════════════════════════════════
export {
  ReviewStatus,
  Sentiment,
  reputationKeys,
  useReputationOverview,
  useReviews,
  useReview,
  useRespondToReview,
  useArchiveReview,
  useGenerateAiResponse,
  useReputationPlatforms,
  useConnectReputationPlatform,
  useDisconnectReputationPlatform,
  useHealthScore,
  useHealthScoreHistory,
  useReputationSettings,
  useUpdateReputationSettings,
} from './use-reputation'

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL (AI)
// ═══════════════════════════════════════════════════════════════════════════
export {
  signalKeys,
  useSignalConfig,
  useUpdateSignalConfig,
  useKnowledge,
  useKnowledgeEntry,
  useCreateKnowledge,
  useUpdateKnowledge,
  useDeleteKnowledge,
  useSyncKnowledge,
  useSignalFaqs,
  useCreateSignalFaq,
  useUpdateSignalFaq,
  useDeleteSignalFaq,
  useSignalSkills,
  useSignalSkill,
  useSignalConversations,
  useSignalConversation,
  useSignalMemories,
  useCreateSignalMemory,
  useDeleteSignalMemory,
  useSignalPatterns,
  useSignalSuggestions,
  useAcceptSignalSuggestion,
  useDismissSignalSuggestion,
  useSignalAnalytics,
} from './use-signal'

// ═══════════════════════════════════════════════════════════════════════════
// SITE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
export {
  SITE_VIEWS,
  siteKeys,
  useSiteStats,
  useSitePages,
  useSitePage,
  useCreateSitePage,
  useUpdateSitePage,
  useDeleteSitePage,
  useSiteImages,
  useCreateSiteImage,
  useUpdateSiteImage,
  useDeleteSiteImage,
  useSiteRedirects,
  useCreateSiteRedirect,
  useUpdateSiteRedirect,
  useDeleteSiteRedirect,
  useSiteFaqs,
  useCreateSiteFaq,
  useUpdateSiteFaq,
  useDeleteSiteFaq,
  useSiteContent,
  useCreateSiteContent,
  useUpdateSiteContent,
  useDeleteSiteContent,
  useSiteLinks,
  useCreateSiteLink,
  useUpdateSiteLink,
  useDeleteSiteLink,
  useApproveSiteLink,
  useSiteScripts,
  useCreateSiteScript,
  useUpdateSiteScript,
  useDeleteSiteScript,
  useSiteSchema,
  useCreateSiteSchema,
  useUpdateSiteSchema,
  useUpdateSiteSchemaItem,
  useDeleteSiteSchema,
} from './use-site'

// ═══════════════════════════════════════════════════════════════════════════
// TEAM
// ═══════════════════════════════════════════════════════════════════════════
export {
  teamKeys,
  useTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useResendInvite,
  useSetTeamMemberStatus,
  useDeleteTeamMember,
} from './use-team'

// ═══════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════
export {
  usersKeys,
  useOrgMembers,
  useInviteOrgMember,
  useUpdateOrgMember,
  useUpdateOrgMemberRole,
  useRemoveOrgMember,
  useProjectMembers,
  useAddProjectMember,
  useUpdateProjectMember,
  useRemoveProjectMember,
  useUser,
  useUpdateUser,
} from './use-users'

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════
export {
  reportsKeys,
  useOverviewReport,
  useFinancialReport,
  useActivityReport,
  useAudits,
  useAllAudits,
  useAudit,
  useRunAudit,
  useDeleteAudit,
  useRequestAudit,
  getAuditStatusBadge,
} from './use-reports'

// ═══════════════════════════════════════════════════════════════════════════
// SEO
// ═══════════════════════════════════════════════════════════════════════════
export {
  seoKeys,
  useSeoProject,
  useCreateSeoProject,
  useSeoPages,
  useSeoPage,
  useUpdateSeoPage,
  useBulkUpdateSeoPages,
  useSeoOpportunities,
  useSeoOpportunitiesSummary,
  useUpdateSeoOpportunity,
  useApplySeoOpportunity,
  useDismissSeoOpportunity,
  useGscOverview,
  useGscQueries,
  useStrikingQueries,
  useSeoSchema,
  useUpsertSeoSchema,
  useSeoFaqs,
  useCreateSeoFaq,
  useUpdateSeoFaq,
  useDeleteSeoFaq,
  useSeoRedirects,
  useCreateSeoRedirect,
  useDeleteSeoRedirect,
  useSeoLinks,
  useCreateSeoLink,
  useUpdateSeoLink,
  useGenerateSeoRecommendations,
  useRunSeoAudit,
  // Blog Brain
  useBlogTopicRecommendations,
  useAnalyzeBlogPost,
  useAnalyzeAllBlogPosts,
  useFixBlogPostEmDashes,
  useOptimizeBlogPost,
  useAddBlogPostCitations,
  // Technical SEO / CWV
  useCwvSummary,
  useCwvHistory,
  useRunCwvAudit,
  // Local SEO / Entity Health
  useEntityHealth,
  useRefreshEntityHealth,
} from './use-seo'

// ═══════════════════════════════════════════════════════════════════════════
// SITE ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════
export {
  siteAnalyticsKeys,
  useSiteAnalyticsOverview,
  useSiteTopPages,
  usePageViewsByDay,
  usePageViewsByHour,
  useSiteSessions,
  useWebVitals,
  useScrollDepth,
  useHeatmap,
  useSiteRealtimeAnalytics,
  useGenerateAnalyticsInsights,
  usePrefetchAnalytics,
} from './use-site-analytics'
