import { createContext, PropsWithChildren, useContext, useMemo } from "react"
import { useSessionState } from "./BrowserStorage"

/**
 * The ResourceListOptions state keeps track of filters and sorting
 * that are applied to resource lists and used across views (with exceptions).
 *
 * As the persistent options for resource listing change, this context may
 * need to be refactored or reconsidered.
 */

// Note: this state was renamed from `SidebarOptions` to `ResourceListOptions`,
// but the local storage key was kept the same
export const RESOURCE_LIST_OPTIONS_KEY = "sidebar_options"

// Statuses represented by the summary indicators at the top of the page.
// Empty string means no status filter is applied.
export const RESOURCE_STATUS_FILTERS = [
  "pending",
  "healthy",
  "unhealthy",
  "warning",
] as const

export type ResourceStatusFilter = typeof RESOURCE_STATUS_FILTERS[number]

export function isResourceStatusFilter(
  value: unknown
): value is ResourceStatusFilter {
  return (
    typeof value === "string" &&
    (RESOURCE_STATUS_FILTERS as readonly string[]).includes(value)
  )
}

export type ResourceListOptions = {
  alertsOnTop: boolean // Note: this is only used/implemented in OverviewSidebar
  resourceNameFilter: string
  resourceStatusFilter: ResourceStatusFilter | ""
  showDisabledResources: boolean
}

type ResourceListOptionsContext = {
  options: ResourceListOptions
  setOptions: (options: Partial<ResourceListOptions>) => void
}

export const DEFAULT_OPTIONS: ResourceListOptions = {
  alertsOnTop: false,
  resourceNameFilter: "",
  resourceStatusFilter: "",
  showDisabledResources: false,
}

export function resourceListFilterApplied(
  options: ResourceListOptions
): boolean {
  return (
    options.resourceNameFilter.length > 0 ||
    options.resourceStatusFilter.length > 0
  )
}

const ResourceListOptionsContext = createContext<ResourceListOptionsContext>({
  options: { ...DEFAULT_OPTIONS },
  setOptions: () => {
    console.warn("Resource list options context is not set.")
  },
})

// Note: non-nullable fields added to `ResourceListOptions` (formerly `SidebarOptions`)
// after its initial release need to have default values filled in here
function normalizeStatusFilter(value: unknown): ResourceStatusFilter | "" {
  return isResourceStatusFilter(value) ? value : ""
}

function maybeUpgradeSavedOptions(
  savedOptions: ResourceListOptions
): ResourceListOptions {
  return {
    ...savedOptions,
    resourceNameFilter: savedOptions.resourceNameFilter ?? "",
    showDisabledResources: savedOptions.showDisabledResources ?? false,
    resourceStatusFilter: normalizeStatusFilter(
      savedOptions.resourceStatusFilter
    ),
  }
}

export function useResourceListOptions(): ResourceListOptionsContext {
  return useContext(ResourceListOptionsContext)
}

export function ResourceListOptionsProvider(
  props: PropsWithChildren<{ initialValuesForTesting?: ResourceListOptions }>
) {
  const defaultPersistentValue = props.initialValuesForTesting ?? {
    ...DEFAULT_OPTIONS,
  }
  const [options, setResourceListOptions] =
    useSessionState<ResourceListOptions>(
      RESOURCE_LIST_OPTIONS_KEY,
      defaultPersistentValue,
      maybeUpgradeSavedOptions
    )

  const defaultValue: ResourceListOptionsContext = useMemo(() => {
    function setOptions(options: Partial<ResourceListOptions>) {
      setResourceListOptions((previousOptions) => ({
        ...previousOptions,
        ...options,
      }))
    }

    return {
      options,
      setOptions,
    }
  }, [options, setResourceListOptions])

  return (
    <ResourceListOptionsContext.Provider value={defaultValue}>
      {props.children}
    </ResourceListOptionsContext.Provider>
  )
}
