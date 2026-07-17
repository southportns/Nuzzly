import { createRouter, createWebHashHistory } from 'vue-router'
import { supabase } from '../lib/supabase'

const routes = [
  { path: '/', name: 'Home', component: () => import('../views/Home.vue') },
  { path: '/butler', name: 'Butler', component: () => import('../views/Butler.vue') },
  { path: '/community', name: 'Community', component: () => import('../views/Community.vue') },
  { path: '/profile', name: 'Profile', component: () => import('../views/Profile.vue') },
  { path: '/settings', name: 'Settings', component: () => import('../views/Settings.vue') },
  { path: '/edit-profile', name: 'EditProfile', component: () => import('../views/EditProfile.vue') },
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
  { path: '/products', name: 'Products', component: () => import('../views/Products.vue') },
  { path: '/products/:id', name: 'ProductDetail', component: () => import('../views/ProductDetail.vue') },
  { path: '/review/create', name: 'ReviewCreate', component: () => import('../views/ReviewCreate.vue') },
  { path: '/followups', name: 'FollowupList', component: () => import('../views/FollowupList.vue') },
  { path: '/followups/:id', name: 'FollowupCreate', component: () => import('../views/FollowupCreate.vue') },
  { path: '/pet/create', name: 'PetCreate', component: () => import('../views/PetCreate.vue') },
  { path: '/record/create', name: 'RecordCreate', component: () => import('../views/RecordCreate.vue') },
  { path: '/settings/sub/:key', name: 'SettingsSub', component: () => import('../views/SettingsSub.vue') },
  { path: '/notifications', name: 'Notifications', component: () => import('../views/Notifications.vue') },
  { path: '/admin', name: 'Admin', component: () => import('../views/Admin.vue') },
  { path: '/dietary-preference', name: 'DietaryPreference', component: () => import('../views/DietaryPreference.vue') },
  { path: '/ai', name: 'AIHub', component: () => import('../views/AIHub.vue') },
  { path: '/pets/:id', name: 'PetEdit', component: () => import('../views/PetCreate.vue') },
  { path: '/tasks/:petId', name: 'DailyTasks', component: () => import('../views/DailyTasks.vue') },
  { path: '/health-reminders', name: 'HealthReminders', component: () => import('../views/HealthReminders.vue') },
  { path: '/health-reminders/create', name: 'HealthReminderCreate', component: () => import('../views/HealthReminderCreate.vue') },
  { path: '/records', name: 'Records', component: () => import('../views/Records.vue') },
  { path: '/avatar/generate', name: 'AvatarGenerate', component: () => import('../views/AvatarGenerate.vue') }
]

const PUBLIC_NAMES = ['Login']
const ONBOARDING_NAMES = ['DietaryPreference', 'PetCreate', 'AvatarGenerate']

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach(async (to) => {
  if (PUBLIC_NAMES.includes(to.name) || ONBOARDING_NAMES.includes(to.name)) return true

  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    return { name: 'Login' }
  }

  return true
})

export default router
