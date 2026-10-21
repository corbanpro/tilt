import React, { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import styled from "styled-components"
import { ReactComponent as CheckmarkSmallSvg } from "./assets/svg/checkmark-small.svg"
import { ReactComponent as CloseSvg } from "./assets/svg/close.svg"
import { ReactComponent as DisabledSvg } from "./assets/svg/not-allowed.svg"
import { ReactComponent as PendingSvg } from "./assets/svg/pending.svg"
import { ReactComponent as WarningSvg } from "./assets/svg/warning.svg"
import { linkToTiltAsset } from "./constants"
import { FilterLevel } from "./logfilters"
import { useLogStore } from "./LogStore"
import { RowValues } from "./OverviewTableColumns"
import { usePathBuilder } from "./PathBuilder"
import {
  ResourceStatusFilter,
  useResourceListOptions,
} from "./ResourceListOptionsContext"
import SidebarItem from "./SidebarItem"
import { buildStatus, combinedStatus, runtimeStatus } from "./status"
import {
  Color,
  Font,
  FontSize,
  mixinResetButtonStyle,
  mixinResetListStyle,
  SizeUnit,
  spin,
} from "./style-helpers"
import Tooltip from "./Tooltip"
import { ResourceName, ResourceStatus, UIResource } from "./types"

const ResourceGroupStatusLabel = styled.p`
  text-transform: uppercase;
  margin-right: ${SizeUnit(0.5)};
`
const ResourceGroupStatusSummaryList = styled.ul`
  display: flex;
  ${mixinResetListStyle}
`
const ResourceGroupStatusSummaryItemRoot = styled.li`
  display: flex;
  align-items: center;

  & + & {
    margin-left: ${SizeUnit(0.25)};
    border-left: 1px solid ${Color.gray40};
    padding-left: ${SizeUnit(0.25)};
  }
  &.is-highlightError {
    color: ${Color.red};
    .fillStd {
      fill: ${Color.red};
    }
  }
  &.is-highlightWarning {
    color: ${Color.yellow};
    .fillStd {
      fill: ${Color.yellow};
    }
  }
  &.is-highlightPending {
    color: ${Color.gray70};
    stroke: ${Color.gray70};
    .fillStd {
      fill: ${Color.gray70};
    }
  }
  &.is-highlightHealthy {
    color: ${Color.green};
    .fillStd {
      fill: ${Color.green};
    }
  }
`
export const ResourceGroupStatusSummaryItemCount = styled.span`
  font-weight: bold;
  padding-left: 4px;
  padding-right: 4px;
`
export const ResourceStatusSummaryRoot = styled.aside`
  display: flex;
  font-family: ${Font.sansSerif};
  font-size: ${FontSize.smallest};
  align-items: center;
  color: ${Color.grayLightest};

  .fillStd {
    fill: ${Color.gray40};
  }

  & + & {
    margin-left: ${SizeUnit(1.5)};
  }
`
export const PendingIcon = styled(PendingSvg)`
  animation: ${spin} 4s linear infinite;
`

const StatusFilterButton = styled.button`
  ${mixinResetButtonStyle}
  display: flex;
  align-items: center;
  color: inherit;
  border-radius: 4px;
  padding: 1px 3px;

  &:hover,
  &:focus-visible {
    background-color: ${Color.gray30};
  }

  &.is-selected {
    background-color: ${Color.gray30};
    box-shadow: inset 0 0 0 1px currentColor;
  }
`

const DisabledIcon = styled(DisabledSvg)`
  .fillStd {
    fill: ${Color.gray60};
  }
`

type ResourceGroupStatusItemProps = {
  label: string
  icon: JSX.Element
  className: string
  count: number
  countOutOf?: number
  href?: string
  pressed?: boolean
  onClick?: () => void
  filterLabel?: string
}

function statusFilterActionLabel(
  filterLabel: string,
  pressed?: boolean
): string {
  return pressed ? `Clear ${filterLabel} filter` : `Filter by ${filterLabel}`
}

export function ResourceGroupStatusItem(props: ResourceGroupStatusItemProps) {
  const count = (
    <>
      <ResourceGroupStatusSummaryItemCount aria-label={`${props.label} count`}>
        {props.count}
      </ResourceGroupStatusSummaryItemCount>
      {props.countOutOf && (
        <>
          /
          <ResourceGroupStatusSummaryItemCount aria-label="Out of total resource count">
            {props.countOutOf}
          </ResourceGroupStatusSummaryItemCount>
        </>
      )}
    </>
  )

  const interactive = !!props.onClick
  const tooltipTitle = interactive
    ? statusFilterActionLabel(props.filterLabel || props.label, props.pressed)
    : props.label

  let summaryContent: JSX.Element
  if (interactive) {
    summaryContent = (
      <StatusFilterButton
        type="button"
        className={props.pressed ? "is-selected" : undefined}
        aria-pressed={!!props.pressed}
        aria-label={tooltipTitle}
        onClick={props.onClick}
      >
        {props.icon}
        {count}
      </StatusFilterButton>
    )
  } else {
    const countDisplay = props.href ? (
      <Link to={props.href}>{count}</Link>
    ) : (
      <>{count}</>
    )
    summaryContent = (
      <>
        {props.icon}
        {countDisplay}
      </>
    )
  }

  const className = props.pressed
    ? `${props.className} is-selected`
    : props.className

  return (
    <Tooltip title={tooltipTitle}>
      <ResourceGroupStatusSummaryItemRoot className={className}>
        {summaryContent}
      </ResourceGroupStatusSummaryItemRoot>
    </Tooltip>
  )
}

type ResourceGroupStatusProps = {
  counts: StatusCounts
  displayText?: string
  labelText: string // Used for a11y markup, should be a descriptive title.
  healthyLabel: string
  unhealthyLabel: string
  warningLabel: string
  linkToLogFilters: boolean
  statusFilter?: ResourceStatusFilter | ""
  onStatusFilterToggle?: (filter: ResourceStatusFilter) => void
}

export function ResourceGroupStatus(props: ResourceGroupStatusProps) {
  if (props.counts.totalEnabled === 0 && props.counts.disabled === 0) {
    return null
  }
  let pb = usePathBuilder()

  let items = new Array<JSX.Element>()

  function filterProps(filter: ResourceStatusFilter, filterLabel: string) {
    if (!props.onStatusFilterToggle) {
      return {}
    }
    return {
      filterLabel,
      pressed: props.statusFilter === filter,
      onClick: () => props.onStatusFilterToggle!(filter),
    }
  }

  if (props.counts.unhealthy || props.statusFilter === "unhealthy") {
    const errorHref =
      props.linkToLogFilters && !props.onStatusFilterToggle
        ? pb.encpath`/r/${ResourceName.all}/overview?level=${FilterLevel.error}`
        : undefined
    items.push(
      <ResourceGroupStatusItem
        key={props.unhealthyLabel}
        label={props.unhealthyLabel}
        count={props.counts.unhealthy}
        href={errorHref}
        className="is-highlightError"
        icon={<CloseSvg role="presentation" width="11" key="icon" />}
        {...filterProps("unhealthy", "failed")}
      />
    )
  }

  if (props.counts.warning || props.statusFilter === "warning") {
    const warningHref =
      props.linkToLogFilters && !props.onStatusFilterToggle
        ? pb.encpath`/r/${ResourceName.all}/overview?level=${FilterLevel.warn}`
        : undefined
    items.push(
      <ResourceGroupStatusItem
        key={props.warningLabel}
        label={props.warningLabel}
        count={props.counts.warning}
        href={warningHref}
        className="is-highlightWarning"
        icon={<WarningSvg role="presentation" width="7" key="icon" />}
        {...filterProps("warning", "warning")}
      />
    )
  }

  if (props.counts.pending || props.statusFilter === "pending") {
    items.push(
      <ResourceGroupStatusItem
        key="pending"
        label="pending"
        count={props.counts.pending}
        className="is-highlightPending"
        icon={<PendingIcon role="presentation" width="8" key="icon" />}
        {...filterProps("pending", "pending")}
      />
    )
  }

  // There might not always be enabled resources
  // if all resources are disabled
  if (props.counts.totalEnabled || props.statusFilter === "healthy") {
    items.push(
      <ResourceGroupStatusItem
        key={props.healthyLabel}
        label={props.healthyLabel}
        count={props.counts.healthy}
        countOutOf={props.counts.totalEnabled}
        className="is-highlightHealthy"
        icon={<CheckmarkSmallSvg role="presentation" key="icon" />}
        {...filterProps("healthy", "healthy")}
      />
    )
  }

  if (props.counts.disabled) {
    items.push(
      <ResourceGroupStatusItem
        key="disabled"
        label="disabled"
        count={props.counts.disabled}
        className="is-highlightDisabled"
        icon={<DisabledIcon role="presentation" width="15" key="icon" />}
      />
    )
  }

  const displayLabel = props.displayText ? (
    <ResourceGroupStatusLabel>{props.displayText}</ResourceGroupStatusLabel>
  ) : null

  return (
    <>
      {displayLabel}
      <ResourceGroupStatusSummaryList>{items}</ResourceGroupStatusSummaryList>
    </>
  )
}

export type StatusCounts = {
  totalEnabled: number
  healthy: number
  unhealthy: number
  pending: number
  warning: number
  disabled: number
}

// True when `status` is one of the resources counted by that summary indicator.
// The healthy indicator includes warnings, matching `statusCounts`.
export function matchesStatusFilter(
  status: ResourceStatus,
  filter: ResourceStatusFilter | ""
): boolean {
  switch (filter) {
    case "pending":
      return (
        status === ResourceStatus.Pending || status === ResourceStatus.Building
      )
    case "unhealthy":
      return status === ResourceStatus.Unhealthy
    case "warning":
      return status === ResourceStatus.Warning
    case "healthy":
      return (
        status === ResourceStatus.Healthy || status === ResourceStatus.Warning
      )
    case "":
      return true
  }
}

export function statusCounts(statuses: ResourceStatus[]): StatusCounts {
  let allEnabledStatusCount = 0
  let healthyStatusCount = 0
  let unhealthyStatusCount = 0
  let pendingStatusCount = 0
  let warningCount = 0
  let disabledCount = 0
  statuses.forEach((status) => {
    if (status === ResourceStatus.Disabled) {
      disabledCount++
      return
    }
    if (status === ResourceStatus.None) {
      // Don't count None status in the overall resource count.
      // These might be manual tasks we haven't run yet.
      return
    }
    allEnabledStatusCount++
    if (matchesStatusFilter(status, "healthy")) {
      healthyStatusCount++
    }
    if (matchesStatusFilter(status, "unhealthy")) {
      unhealthyStatusCount++
    }
    if (matchesStatusFilter(status, "pending")) {
      pendingStatusCount++
    }
    if (matchesStatusFilter(status, "warning")) {
      warningCount++
    }
  })

  return {
    totalEnabled: allEnabledStatusCount,
    healthy: healthyStatusCount,
    unhealthy: unhealthyStatusCount,
    pending: pendingStatusCount,
    warning: warningCount,
    disabled: disabledCount,
  }
}

export function getDocumentTitle(
  counts: StatusCounts,
  isSnapshot: boolean,
  isSocketConnected: boolean
) {
  const { totalEnabled, healthy, pending, unhealthy } = counts
  let faviconHref = "/static/ico/favicon-green.ico"
  let title = `✔︎ ${healthy}/${totalEnabled} ┊ Tilt`
  if (!isSocketConnected && !isSnapshot) {
    title = "Disconnected ┊ Tilt"
    // Use a publicly-hosted favicon since Tilt is disconnected
    // and it's not guaranteed that the favicon will be cached
    faviconHref = linkToTiltAsset("ico", "dashboard-favicon-gray.ico")
  } else if (unhealthy > 0) {
    title = `✖︎ ${unhealthy} ┊ Tilt`
    faviconHref = "/static/ico/favicon-red.ico"
  } else if (pending) {
    title = `… ${healthy}/${totalEnabled} ┊ Tilt`
    faviconHref = "/static/ico/favicon-gray.ico"
  } else if (totalEnabled === 0) {
    title = `✔︎ 0/0 ┊ Tilt`
    faviconHref = "/static/ico/favicon-gray.ico"
  }

  if (isSnapshot) {
    title = `Snapshot: ${title}`
  }

  return { title, faviconHref }
}

function ResourceMetadata(props: {
  counts: StatusCounts
  isSocketConnected?: boolean
}) {
  let { totalEnabled, healthy, pending, unhealthy } = props.counts
  const pb = usePathBuilder()
  const isSnapshot = pb.isSnapshot()

  useEffect(() => {
    // Determine the document title and favicon based
    // on Tilt's connection, resource statuses, and whether
    // or not Tilt is displaying a snapshot
    const existingFavicon =
      document.head.querySelector<HTMLLinkElement>("#favicon")
    const { title, faviconHref } = getDocumentTitle(
      props.counts,
      isSnapshot,
      props.isSocketConnected ?? true
    )
    document.title = title
    if (existingFavicon) {
      existingFavicon.href = faviconHref
    }
  }, [totalEnabled, healthy, pending, unhealthy, props.isSocketConnected])
  return <></>
}

type NotificationSpec = { tag: string } & (
  | { action: "show"; body: string }
  | { action: "close" }
)

export function ResourceNotification(props: {
  counts: StatusCounts
  isSocketConnected?: boolean
}) {
  const { pending, unhealthy } = props.counts
  const [allowed, setAllowed] = useState<boolean>(false)
  const firstRun = useRef(true)
  const [notification, setNotification] = useState<Notification | undefined>()

  useEffect(() => {
    try {
      Notification.requestPermission().then((result) =>
        setAllowed(result === "granted")
      )
    } catch (e) {
      console.error("failed to request notification permissions", e)
    }
  })

  const buildSpec: () => NotificationSpec = useCallback(() => {
    if (unhealthy > 0) {
      return {
        tag: "unhealthy",
        action: "show",
        body: `Unhealthy resources: ${unhealthy}`,
      }
    } else if (pending == 0) {
      return {
        tag: "ready",
        action: "show",
        body: "Ready",
      }
    } else {
      // close existing 'ready' so later changes renotify
      return {
        tag: "ready",
        action: "close",
      }
    }
  }, [allowed, pending, unhealthy])

  useEffect(() => {
    if (allowed) {
      if (firstRun.current) {
        firstRun.current = false
        return
      }

      const spec = buildSpec()
      if (notification) {
        if (notification.tag !== spec.tag || spec.action === "close") {
          notification.close()
        }
      }

      if (spec.action === "show") {
        setNotification(
          new Notification("Tilt", {
            body: spec.body,
            tag: spec.tag,
          })
        )
      }
    }
  }, [allowed, buildSpec])

  return <></>
}

type ResourceStatusSummaryOptions = {
  displayText?: string
  labelText?: string
  updateMetadata?: boolean
  linkToLogFilters?: boolean
  showNotifications?: boolean
  statusFilter?: ResourceStatusFilter | ""
  onStatusFilterToggle?: (filter: ResourceStatusFilter) => void
}

type ResourceStatusSummaryProps = {
  statuses: ResourceStatus[]
  isSocketConnected?: boolean
} & ResourceStatusSummaryOptions

function ResourceStatusSummary(props: ResourceStatusSummaryProps) {
  // Default the display options if no option is provided
  const updateMetadata = props.updateMetadata ?? true
  const linkToLogFilters = props.linkToLogFilters ?? true
  const labelText = props.labelText ?? "Resource status summary"
  const showNotifications = props.showNotifications ?? true

  return (
    <ResourceStatusSummaryRoot aria-label={labelText}>
      {updateMetadata && (
        <ResourceMetadata
          counts={statusCounts(props.statuses)}
          isSocketConnected={props.isSocketConnected}
        />
      )}
      {showNotifications && (
        <ResourceNotification counts={statusCounts(props.statuses)} />
      )}
      <ResourceGroupStatus
        counts={statusCounts(props.statuses)}
        displayText={props.displayText}
        labelText={labelText}
        healthyLabel={"healthy"}
        unhealthyLabel={"err"}
        warningLabel={"warn"}
        linkToLogFilters={linkToLogFilters}
        statusFilter={props.statusFilter}
        onStatusFilterToggle={props.onStatusFilterToggle}
      />
    </ResourceStatusSummaryRoot>
  )
}

// The generic StatusSummaryProps takes a template type
// for the resources it will summarize, so that it can be used
// throughout the app with different data types.

type StatusSummaryProps<T> = {
  resources: readonly T[]
  isSocketConnected?: boolean
} & ResourceStatusSummaryOptions

export function SidebarGroupStatusSummary(
  props: StatusSummaryProps<SidebarItem>
) {
  const allStatuses = props.resources.map((item: SidebarItem) =>
    combinedStatus(item.buildStatus, item.runtimeStatus)
  )

  return (
    <ResourceStatusSummary
      statuses={allStatuses}
      linkToLogFilters={false}
      updateMetadata={false}
      showNotifications={false}
      {...props}
    />
  )
}

export function TableGroupStatusSummary(props: StatusSummaryProps<RowValues>) {
  const allStatuses = props.resources.map((r: RowValues) =>
    combinedStatus(r.statusLine.buildStatus, r.statusLine.runtimeStatus)
  )

  return (
    <ResourceStatusSummary
      statuses={allStatuses}
      linkToLogFilters={false}
      updateMetadata={false}
      showNotifications={false}
      {...props}
    />
  )
}

export function AllResourceStatusSummary(
  props: StatusSummaryProps<UIResource>
) {
  const logStore = useLogStore()
  const { options, setOptions } = useResourceListOptions()
  const allStatuses = props.resources.map((r: UIResource) =>
    combinedStatus(buildStatus(r, logStore), runtimeStatus(r, logStore))
  )

  const onStatusFilterToggle = (filter: ResourceStatusFilter) => {
    setOptions({
      resourceStatusFilter:
        options.resourceStatusFilter === filter ? "" : filter,
    })
  }

  return (
    <ResourceStatusSummary
      statuses={allStatuses}
      {...props}
      linkToLogFilters={false}
      statusFilter={options.resourceStatusFilter}
      onStatusFilterToggle={onStatusFilterToggle}
    />
  )
}
