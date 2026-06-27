import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/butler',
    name: 'Butler',
    component: () => import('../views/Butler.vue')
  },
  {
    path: '/community',
    name: 'Community',
    component: () => import('../views/Community.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue')
  },
  {
    path: '/edit-profile',
    name: 'EditProfile',
    component: () => import('../views/EditProfile.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/products',
    name: 'Products',
    component: () => import('../views/Products.vue')
  },
  {
    path: '/products/:id',
    name: 'ProductDetail',
    component: () => import('../views/ProductDetail.vue')
  },
  {
    path: '/review/create',
    name: 'ReviewCreate',
    component: () => import('../views/ReviewCreate.vue')
  },
  {
    path: '/followups',
    name: 'FollowupList',
    component: () => import('../views/FollowupList.vue')
  },
  {
    path: '/followups/:id',
    name: 'FollowupCreate',
    component: () => import('../views/FollowupCreate.vue')
  },
  {
    path: '/pet/create',
    name: 'PetCreate',
    component: () => import('../views/PetCreate.vue')
  },
  {
    path: '/record/create',
    name: 'RecordCreate',
    component: () => import('../views/RecordCreate.vue')
  },
  {
    path: '/settings/sub/:key',
    name: 'SettingsSub',
    component: () => import('../views/SettingsSub.vue')
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('../views/Notifications.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/Admin.vue')
  },
  {
    path: '/pet/quick',
    name: 'QuickPetCreate',
    component: () => import('../views/QuickPetCreate.vue')
  },
  {
    path: '/dietary-preference',
    name: 'DietaryPreference',
    component: () => import('../views/DietaryPreference.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫：未登录跳转 Login（Login/B Butler 等公开页放行）
const PUBLIC_NAMES = ['Login']
router.beforeEach(async (to) => {
  if (PUBLIC_NAMES.includes(to.name)) return true
  const { supabase } = await import('../lib/supabase')
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    // 未登录：降级到 mock 模式继续浏览（开发期友好），生产可改为 return { name: 'Login' }
    return true
  }
  return true
})

export default router
