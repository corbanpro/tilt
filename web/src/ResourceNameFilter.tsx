import { InputAdornment } from "@material-ui/core"
import { InputProps as StandardInputProps } from "@material-ui/core/Input/Input"
import React from "react"
import styled from "styled-components"
import { ReactComponent as CloseSvg } from "./assets/svg/close.svg"
import { ReactComponent as SearchSvg } from "./assets/svg/search.svg"
import {
  InstrumentedButton,
  InstrumentedTextField,
} from "./instrumentedComponents"
import { useResourceListOptions } from "./ResourceListOptionsContext"
import {
  Color,
  Font,
  FontSize,
  mixinResetButtonStyle,
  SizeUnit,
} from "./style-helpers"

const RESOURCE_NAME_REGEXP_FLAGS = "i"

// Empty string when the filter is blank or a valid regexp.
// Invalid patterns match every resource so the list stays visible while typing.
export function resourceNameFilterError(filter: string): string {
  const pattern = filter.trim()
  if (pattern === "") {
    return ""
  }
  try {
    new RegExp(pattern, RESOURCE_NAME_REGEXP_FLAGS)
    return ""
  } catch (error: any) {
    let message = "Invalid regexp"
    if (error.message) {
      message += `: ${error.message}`
    }
    return message
  }
}

export function matchesResourceName(
  resourceName: string,
  filter: string
): boolean {
  const pattern = filter.trim()
  if (pattern === "") {
    return true
  }
  try {
    return new RegExp(pattern, RESOURCE_NAME_REGEXP_FLAGS).test(resourceName)
  } catch {
    return true
  }
}

export const ResourceNameFilterTextField = styled(InstrumentedTextField)`
  & .MuiOutlinedInput-root {
    border-radius: ${SizeUnit(0.5)};
    border: 1px solid ${Color.gray40};
    background-color: ${Color.gray30};

    & fieldset {
      border-color: 1px solid ${Color.gray40};
    }
    &:hover fieldset {
      border: 1px solid ${Color.gray40};
    }
    &.Mui-focused fieldset {
      border: 1px solid ${Color.gray40};
    }
    &.Mui-error {
      border-color: ${Color.red};
    }
    &.Mui-error fieldset,
    &.Mui-error:hover fieldset,
    &.Mui-error.Mui-focused fieldset {
      border: 1px solid ${Color.red};
    }
    & .MuiOutlinedInput-input {
      padding: ${SizeUnit(0.2)};
    }
  }

  margin-top: ${SizeUnit(0.4)};
  margin-bottom: ${SizeUnit(0.4)};
  flex-grow: 1;

  & .MuiInputBase-input {
    font-family: ${Font.monospace};
    color: ${Color.offWhite};
    font-size: ${FontSize.small};
  }

  & .MuiFormHelperText-root.Mui-error {
    color: ${Color.red};
    font-family: ${Font.sansSerif};
    font-size: ${FontSize.smallest};
  }
`

export const ClearResourceNameFilterButton = styled(InstrumentedButton)`
  ${mixinResetButtonStyle};
  display: flex;
  align-items: center;
`

export const RESOURCE_NAME_FILTER_INPUT_ID = "ResourceNameFilter"

export function ResourceNameFilter(props: { className?: string }) {
  const {
    options: { resourceNameFilter },
    setOptions,
  } = useResourceListOptions()

  function setResourceNameFilter(newValue: string) {
    setOptions({ resourceNameFilter: newValue })
  }

  const regexpError = resourceNameFilterError(resourceNameFilter)

  let inputProps: Partial<StandardInputProps> = {
    "aria-label": "Filter resources by regexp",
    startAdornment: (
      <InputAdornment position="start">
        <SearchSvg fill={Color.grayLightest} />
      </InputAdornment>
    ),
  }

  // only show the "x" to clear if there's any input to clear
  if (resourceNameFilter.length) {
    const onClearClick = () => setResourceNameFilter("")

    inputProps.endAdornment = (
      <InputAdornment position="end">
        <ClearResourceNameFilterButton
          onClick={onClearClick}
          aria-label="Clear name filter"
        >
          <CloseSvg role="presentation" fill={Color.grayLightest} />
        </ClearResourceNameFilterButton>
      </InputAdornment>
    )
  }

  return (
    <ResourceNameFilterTextField
      id={RESOURCE_NAME_FILTER_INPUT_ID}
      className={props.className}
      value={resourceNameFilter ?? ""}
      onChange={(e) => setResourceNameFilter(e.target.value)}
      placeholder="Filter resources by regexp"
      error={regexpError !== ""}
      helperText={regexpError}
      InputProps={inputProps}
      variant="outlined"
    />
  )
}
