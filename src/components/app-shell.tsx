import { router, usePathname } from 'expo-router'
import { ChevronRight, LogOut, Menu as MenuIcon, UserRound, X, type LucideIcon } from 'lucide-react-native'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { initials } from '@/lib/api'
import { useSession } from '@/lib/session'
import { radius, useColors } from '@/theme'
import { COLLEGE_CITY, COLLEGE_NAME, Emblem, MadeBy, PORTAL_NAME } from './brand'
import { Text } from './ui'

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean }
type ShellConfig = { role: 'Faculty' | 'Student'; nav: NavItem[]; quick?: NavItem[]; action?: { href: string; label: string; icon: LucideIcon }; profileHref?: string }

const ShellContext = createContext<{ openMenu: () => void; openAccount: () => void; config: ShellConfig } | null>(null)

/**
 * The workspace shell from the website, for phones: a slide-in sidebar (hamburger) with the college
 * identity, the main action and the navigation; and an account menu under the avatar in the top bar.
 */
export function ShellProvider({ config, children }: { config: ShellConfig; children: React.ReactNode }) {
  const [menu, setMenu] = useState(false)
  const [account, setAccount] = useState(false)
  const value = useMemo(() => ({ openMenu: () => setMenu(true), openAccount: () => setAccount(true), config }), [config])
  return (
    <ShellContext.Provider value={value}>
      {children}
      <Sidebar open={menu} onClose={() => setMenu(false)} config={config} />
      <AccountMenu open={account} onClose={() => setAccount(false)} config={config} />
    </ShellContext.Provider>
  )
}

function useShell() {
  const value = useContext(ShellContext)
  if (!value) throw new Error('useShell must be used inside ShellProvider')
  return value
}

const isActive = (pathname: string, item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`))

/** Top bar of the main screens: menu · emblem + page title · avatar (account menu). */
export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  const { openMenu, openAccount } = useShell()
  const { teacher, student } = useSession()
  const name = teacher?.name || student?.name || teacher?.email || student?.email || ''
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: c.background, borderBottomColor: c.border }]}>
      <Pressable onPress={openMenu} hitSlop={8} accessibilityRole="button" accessibilityLabel="Open menu" style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? c.muted : 'transparent' }]}>
        <MenuIcon size={22} color={c.foreground} />
      </Pressable>
      <Emblem size={30} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size={16} weight="semibold" numberOfLines={1}>{title}</Text>
        <Text size={12} tone="mutedForeground" numberOfLines={1}>{subtitle ?? today}</Text>
      </View>
      {right}
      <Pressable onPress={openAccount} hitSlop={6} accessibilityRole="button" accessibilityLabel="Account and profile" style={({ pressed }) => [styles.avatarButton, { backgroundColor: pressed ? c.muted : 'transparent' }]}>
        <View style={[styles.avatar, { backgroundColor: c.primary }]}>
          <Text size={12} weight="semibold" color={c.primaryForeground}>{initials(name)}</Text>
        </View>
      </Pressable>
    </View>
  )
}

function Sidebar({ open, onClose, config }: { open: boolean; onClose: () => void; config: ShellConfig }) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const { teacher, student, signOut } = useSession()
  const [visible, setVisible] = useState(open)
  const [slide] = useState(() => new Animated.Value(0))

  if (open && !visible) setVisible(true)
  useEffect(() => {
    Animated.timing(slide, { toValue: open ? 1 : 0, duration: open ? 260 : 200, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      .start(({ finished }) => { if (finished && !open) setVisible(false) })
  }, [open, slide])

  const go = useCallback((href: string) => { onClose(); router.navigate(href as never) }, [onClose])
  const user = teacher ?? student
  const detail = teacher ? teacher.department : [student?.classLabel, student?.rollNumber && `Roll ${student.rollNumber}`].filter(Boolean).join(' · ')
  const workspace = config.role === 'Faculty' ? 'Faculty workspace' : 'Student portal'

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      </Animated.View>
      <Animated.View style={[styles.sidebar, { backgroundColor: c.sidebar, borderRightColor: c.sidebarBorder, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 12, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-320, 0] }) }] }]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
          {/* College identity */}
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Emblem size={48} />
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close menu" style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? c.sidebarHover : 'transparent' }]}>
                <X size={20} color={c.sidebarMuted} />
              </Pressable>
            </View>
            <Text serif size={17} leading={22} tracking={-0.2} style={{ marginTop: 14 }}>{COLLEGE_NAME}</Text>
            <Text size={12} color={c.sidebarMuted} style={{ marginTop: 2 }}>{COLLEGE_CITY} · {PORTAL_NAME}</Text>
            <View style={[styles.workspace, { borderColor: c.sidebarBorder, backgroundColor: c.card }]}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.success }} />
              <Text size={11} weight="medium" color={c.sidebarForeground}>{workspace}</Text>
            </View>
          </View>

          {config.action && (
            <Pressable onPress={() => go(config.action!.href)} style={({ pressed }) => [styles.action, { backgroundColor: pressed ? c.primaryHover : c.primary }]}>
              <config.action.icon size={18} color={c.primaryForeground} />
              <Text size={14} weight="medium" color={c.primaryForeground}>{config.action.label}</Text>
            </Pressable>
          )}

          <Text size={11} weight="medium" uppercase tracking={1.3} color={c.sidebarMuted} style={{ paddingHorizontal: 24, marginTop: 24, marginBottom: 8 }}>Menu</Text>
          <View style={{ paddingHorizontal: 12, gap: 2 }}>
            {config.nav.map(item => {
              const active = isActive(pathname, item)
              return (
                <Pressable key={item.href} onPress={() => go(item.href)} accessibilityState={{ selected: active }}
                  style={({ pressed }) => [styles.navItem, { backgroundColor: active ? c.sidebarActive : pressed ? c.sidebarHover : 'transparent' }]}>
                  {active && <View style={[styles.activeBar, { backgroundColor: c.primary }]} />}
                  <item.icon size={18} color={active ? c.primary : c.sidebarMuted} />
                  <Text size={14} weight={active ? 'medium' : 'regular'} color={active ? c.foreground : c.sidebarForeground}>{item.label}</Text>
                </Pressable>
              )
            })}
          </View>

          {config.quick?.length ? (
            <>
              <Text size={11} weight="medium" uppercase tracking={1.3} color={c.sidebarMuted} style={{ paddingHorizontal: 24, marginTop: 20, marginBottom: 8 }}>Quick actions</Text>
              <View style={{ paddingHorizontal: 12, gap: 2 }}>
                {config.quick.map(item => (
                  <Pressable key={item.href} onPress={() => go(item.href)} style={({ pressed }) => [styles.navItem, { backgroundColor: pressed ? c.sidebarHover : 'transparent' }]}>
                    <item.icon size={18} color={c.sidebarMuted} />
                    <Text size={14} color={c.sidebarForeground}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <View style={{ flex: 1 }} />
          <View style={[styles.footer, { borderTopColor: c.sidebarBorder }]}>
            <Pressable onPress={() => { if (config.profileHref) go(config.profileHref) }} disabled={!config.profileHref}
              style={({ pressed }) => [styles.userRow, { backgroundColor: pressed ? c.sidebarHover : 'transparent' }]}>
              <View style={[styles.avatar, { width: 36, height: 36, borderRadius: 18, backgroundColor: c.primary }]}>
                <Text size={12} weight="semibold" color={c.primaryForeground}>{initials(user?.name || user?.email || '')}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text size={13} weight="medium" numberOfLines={1}>{user?.name || 'Account'}</Text>
                <Text size={11} color={c.sidebarMuted} numberOfLines={1}>{detail || user?.email}</Text>
              </View>
              {config.profileHref ? <ChevronRight size={16} color={c.sidebarMuted} /> : null}
            </Pressable>
            <Pressable onPress={() => { onClose(); signOut() }} style={({ pressed }) => [styles.navItem, { backgroundColor: pressed ? c.sidebarHover : 'transparent' }]}>
              <LogOut size={18} color={c.danger} />
              <Text size={14} tone="danger">Sign out</Text>
            </Pressable>
            <View style={{ marginTop: 10 }}><MadeBy /></View>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  )
}

/** Dropdown under the avatar, like the website's account menu. */
function AccountMenu({ open, onClose, config }: { open: boolean; onClose: () => void; config: ShellConfig }) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  const { teacher, student, signOut } = useSession()
  const user = teacher ?? student
  const detail = teacher ? teacher.department : [student?.classLabel, student?.rollNumber && `Roll ${student.rollNumber}`].filter(Boolean).join(' · ')
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close account menu" />
      <View style={[styles.dropdown, { top: insets.top + 58, backgroundColor: c.popover, borderColor: c.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
          <View style={[styles.avatar, { width: 40, height: 40, borderRadius: 20, backgroundColor: c.primary }]}>
            <Text size={13} weight="semibold" color={c.primaryForeground}>{initials(user?.name || user?.email || '')}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size={14} weight="semibold" numberOfLines={1}>{user?.name || 'Account'}</Text>
            <Text size={12} tone="mutedForeground" numberOfLines={1}>{user?.email}</Text>
            {detail ? <Text size={12} tone="mutedForeground" numberOfLines={1}>{detail}</Text> : null}
          </View>
        </View>
        <View style={{ padding: 6 }}>
          <View style={[styles.rolePill, { borderColor: c.border }]}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.success }} />
            <Text size={11} weight="medium" tone="mutedForeground">{config.role}</Text>
          </View>
          {config.profileHref && (
            <MenuRow icon={UserRound} label="Profile" onPress={() => { onClose(); router.navigate(config.profileHref as never) }} />
          )}
          <MenuRow icon={LogOut} label="Sign out" danger onPress={() => { onClose(); signOut() }} />
        </View>
      </View>
    </Modal>
  )
}

function MenuRow({ icon: Icon, label, onPress, danger }: { icon: LucideIcon; label: string; onPress: () => void; danger?: boolean }) {
  const c = useColors()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 11, borderRadius: radius.md, backgroundColor: pressed ? c.secondary : 'transparent' }]}>
      <Icon size={17} color={danger ? c.danger : c.mutedForeground} />
      <Text size={14} tone={danger ? 'danger' : 'foreground'}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  iconButton: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarButton: { padding: 3, borderRadius: radius.full },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sidebar: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 300, maxWidth: '86%', borderRightWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 4, height: 0 }, elevation: 16 },
  workspace: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, marginTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: radius.xl, marginHorizontal: 16, marginTop: 20 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, borderRadius: radius.xl, paddingHorizontal: 12 },
  activeBar: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 20, paddingTop: 10, paddingHorizontal: 12, gap: 2 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: radius.xl },
  dropdown: { position: 'absolute', right: 12, width: 264, borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 3, marginHorizontal: 8, marginTop: 6, marginBottom: 4 },
})
