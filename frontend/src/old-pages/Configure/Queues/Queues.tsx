// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

//
// Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
// with the License. A copy of the License is located at
//
// http://aws.amazon.com/apache2.0/
//
// or in the "LICENSE.txt" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
// OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and
// limitations under the License.
import * as React from 'react'
import i18next from 'i18next'
import {findFirst} from '../../../util'

// UI Elements
import {
  Button,
  Box,
  Container,
  ColumnLayout,
  ExpandableSection,
  FormField,
  Header,
  Input,
  Select,
  SpaceBetween,
  Toggle,
  MultiselectProps,
} from '@cloudscape-design/components'

// State
import {setState, getState, useState, clearState} from '../../../store'

// Components
import {
  ActionsEditor,
  CustomAMISettings,
  LabeledIcon,
  RootVolume,
  SecurityGroups,
  IamPoliciesEditor,
  SubnetSelect,
} from '../Components'
import {Trans, useTranslation} from 'react-i18next'
import {SlurmMemorySettings} from './SlurmMemorySettings'
import {
  isFeatureEnabled,
  useFeatureFlag,
} from '../../../feature-flags/useFeatureFlag'
import * as SingleInstanceCR from './SingleInstanceComputeResource'
import * as MultiInstanceCR from './MultiInstanceComputeResource'
import {AllocationStrategy, ComputeResource} from './queues.types'
import {SubnetMultiSelect} from './SubnetMultiSelect'
import {NonCancelableEventHandler} from '@cloudscape-design/components/internal/events'

// Constants
const queuesPath = ['app', 'wizard', 'config', 'Scheduling', 'SlurmQueues']
const queuesErrorsPath = ['app', 'wizard', 'errors', 'queues']

// Helper Functions
// @ts-expect-error TS(7031) FIXME: Binding element 'value' implicitly has an 'any' ty... Remove this comment to see the full error message
function itemToIconOption([value, label, icon]) {
  return {value: value, label: label, ...(icon ? {iconUrl: icon} : {})}
}

// @ts-expect-error TS(7031) FIXME: Binding element 'value' implicitly has an 'any' ty... Remove this comment to see the full error message
function itemToDisplayIconOption([value, label, icon]) {
  return {
    value: value,
    label: icon ? <LabeledIcon label={label} icon={icon} /> : label,
  }
}

function queueValidate(queueIndex: any) {
  let valid = true
  const queueSubnet = getState([
    ...queuesPath,
    queueIndex,
    'Networking',
    'SubnetIds',
    0,
  ])
  const computeResources = getState([
    ...queuesPath,
    queueIndex,
    'ComputeResources',
  ])

  const errorsPath = [...queuesErrorsPath, queueIndex]

  const actionsPath = [...queuesPath, queueIndex, 'CustomActions']

  const onStartPath = [...actionsPath, 'OnNodeStart']
  const onStart = getState(onStartPath)

  const onConfiguredPath = [...actionsPath, 'OnNodeConfigured']
  const onConfigured = getState(onConfiguredPath)

  const customAmiEnabled = getState([
    'app',
    'wizard',
    'queues',
    queueIndex,
    'customAMI',
    'enabled',
  ])
  const customAmi = getState([...queuesPath, queueIndex, 'Image', 'CustomAmi'])

  const rootVolumeSizePath = [
    ...queuesPath,
    queueIndex,
    'ComputeSettings',
    'LocalStorage',
    'RootVolume',
    'Size',
  ]
  const rootVolumeValue = getState(rootVolumeSizePath)

  if (rootVolumeValue === '') {
    setState(
      [...errorsPath, 'rootVolume'],
      i18next.t('wizard.queues.validation.setRootVolumeSize'),
    )
    valid = false
  } else if (
    rootVolumeValue &&
    (!Number.isInteger(rootVolumeValue) || rootVolumeValue < 35)
  ) {
    setState(
      [...errorsPath, 'rootVolume'],
      i18next.t('wizard.queues.validation.rootVolumeMinimum'),
    )
    valid = false
  } else {
    clearState([...errorsPath, 'rootVolume'])
  }

  if (
    onStart &&
    getState([...onStartPath, 'Args']) &&
    !getState([...onStartPath, 'Script'])
  ) {
    setState(
      [...errorsPath, 'onStart'],
      i18next.t('wizard.queues.validation.rootVolumeMinimum'),
    )
    valid = false
  } else {
    clearState([...errorsPath, 'onStart'])
  }

  if (
    onConfigured &&
    getState([...onConfiguredPath, 'Args']) &&
    !getState([...onConfiguredPath, 'Script'])
  ) {
    setState(
      [...errorsPath, 'onConfigured'],
      i18next.t('wizard.queues.validation.scriptWithArgs'),
    )
    valid = false
  } else {
    clearState([...errorsPath, 'onConfigured'])
  }

  if (customAmiEnabled && !customAmi) {
    setState(
      [...errorsPath, 'customAmi'],
      i18next.t('wizard.queues.validation.customAmiSelect'),
    )
    valid = false
  } else {
    clearState([...errorsPath, 'customAmi'])
  }

  const version = getState(['app', 'version', 'full'])
  const isMultiAZActive = isFeatureEnabled(version, 'multi_az')
  if (!queueSubnet) {
    let message: string
    if (isMultiAZActive) {
      message = i18next.t('wizard.queues.validation.selectSubnets')
    } else {
      message = i18next.t('wizard.queues.validation.selectSubnet')
    }
    setState([...errorsPath, 'subnet'], message)
    valid = false
  } else {
    setState([...errorsPath, 'subnet'], null)
  }

  const isMultiInstanceTypesActive = isFeatureEnabled(
    version,
    'queues_multiple_instance_types',
  )
  const {validateComputeResources} = !isMultiInstanceTypesActive
    ? SingleInstanceCR
    : MultiInstanceCR
  const [computeResourcesValid, computeResourcesErrors] =
    validateComputeResources(computeResources)
  if (!computeResourcesValid) {
    valid = false
    computeResources.forEach((_: ComputeResource, i: number) => {
      const error = computeResourcesErrors[i]
      if (error) {
        let message: string
        if (error === 'instance_type_unique') {
          message = i18next.t('wizard.queues.validation.instanceTypeUnique')
        } else {
          message = i18next.t('wizard.queues.validation.instanceTypeMissing')
        }
        setState([...errorsPath, 'computeResource', i, 'type'], message)
      } else {
        setState([...errorsPath, 'computeResource', i, 'type'], null)
      }
    })
  }

  return valid
}

function queuesValidate() {
  let valid = true
  const config = getState(['app', 'wizard', 'config'])
  console.log(config)

  setState([...queuesErrorsPath, 'validated'], true)

  const queues = getState([...queuesPath])
  for (let i = 0; i < queues.length; i++) {
    let queueValid = queueValidate(i)
    valid &&= queueValid
  }

  return valid
}

function ComputeResources({queue, index, canUseEFA}: any) {
  const {ViewComponent} = useComputeResourceAdapter()
  return (
    <Container>
      {queue.ComputeResources.map((computeResource: any, i: any) => (
        <ViewComponent
          queue={queue}
          computeResource={computeResource}
          index={i}
          queueIndex={index}
          key={i}
          canUseEFA={canUseEFA}
        />
      ))}
    </Container>
  )
}

const useAllocationStrategyOptions = () => {
  const {t} = useTranslation()
  const options = React.useMemo(
    () => [
      {
        label: t('wizard.queues.allocationStrategy.lowestPrice'),
        value: 'lowest-price',
      },
      {
        label: t('wizard.queues.allocationStrategy.capacityOptimized'),
        value: 'capacity-optimized',
      },
    ],
    [t],
  )
  return options
}

function Queue({index}: any) {
  const {t} = useTranslation()
  const queues = useState(queuesPath)
  const [editingName, setEditingName] = React.useState(false)
  const computeResourceAdapter = useComputeResourceAdapter()
  const queue = useState([...queuesPath, index])
  const enablePlacementGroupPath = React.useMemo(
    () => [...queuesPath, index, 'Networking', 'PlacementGroup', 'Enabled'],
    [index],
  )
  const enablePlacementGroup = useState(enablePlacementGroupPath)

  const isMultiInstanceTypesActive = useFeatureFlag(
    'queues_multiple_instance_types',
  )
  const allocationStrategyOptions = useAllocationStrategyOptions()

  const errorsPath = [...queuesErrorsPath, index]
  const subnetError = useState([...errorsPath, 'subnet'])

  const allocationStrategy: AllocationStrategy = useState([
    ...queuesPath,
    index,
    'AllocationStrategy',
  ])

  const capacityTypes: [string, string, string][] = [
    ['ONDEMAND', 'On-Demand', '/img/od.svg'],
    ['SPOT', 'Spot', '/img/spot.svg'],
  ]
  const capacityTypePath = [...queuesPath, index, 'CapacityType']
  const capacityType: string = useState(capacityTypePath) || 'ONDEMAND'

  const subnetPath = [...queuesPath, index, 'Networking', 'SubnetIds']
  const subnetsList = useState(subnetPath) || []
  const isMultiAZActive = useFeatureFlag('multi_az')

  const remove = () => {
    setState(
      [...queuesPath],
      [...queues.slice(0, index), ...queues.slice(index + 1)],
    )
  }
  const addComputeResource = () => {
    const existingCRs = queue.ComputeResources || []
    setState([...queuesPath, index], {
      ...queue,
      ComputeResources: [
        ...existingCRs,
        computeResourceAdapter.createComputeResource(index, existingCRs.length),
      ],
    })
  }

  const setEnablePG = React.useCallback(
    (enable: any) => {
      setState(enablePlacementGroupPath, enable)
    },
    [enablePlacementGroupPath],
  )

  const onSubnetMultiSelectChange: NonCancelableEventHandler<MultiselectProps.MultiselectChangeDetail> =
    React.useCallback(
      ({detail}) => {
        setSubnetsAndValidate(index, queueValidate, detail)
      },
      [index],
    )

  const onSubnetSelectChange = React.useCallback(
    (subnetId: string) => {
      setState(subnetPath, [subnetId])
      queueValidate(index)
    },
    [subnetPath, index],
  )

  const {canUseEFA, canUsePlacementGroup} = areMultiAZSelected(subnetsList)
  React.useEffect(() => {
    if (!canUsePlacementGroup) {
      setEnablePG(false)
    }
  }, [canUsePlacementGroup, setEnablePG])

  const renameQueue = (newName: any) => {
    const computeResources = getState([
      ...queuesPath,
      index,
      'ComputeResources',
    ])
    const updatedCRs = computeResourceAdapter.updateComputeResourcesNames(
      computeResources,
      newName,
    )
    setState([...queuesPath, index, 'Name'], newName)
    setState([...queuesPath, index, 'ComputeResources'], updatedCRs)
  }

  const setAllocationStrategy = React.useCallback(
    ({detail}) => {
      setState(
        [...queuesPath, index, 'AllocationStrategy'],
        detail.selectedOption.value,
      )
    },
    [index],
  )

  return (
    <div className="queue">
      <div className="queue-properties">
        <Box margin={{bottom: 'xs'}}>
          <Header
            // @ts-expect-error TS(2322) FIXME: Type '"h4"' is not assignable to type 'Variant | u... Remove this comment to see the full error message
            variant="h4"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  disabled={queue.ComputeResources.length >= 3}
                  onClick={addComputeResource}
                >
                  Add Resource
                </Button>
                {index > 0 && <Button onClick={remove}>Remove Queue</Button>}
              </SpaceBetween>
            }
          >
            <SpaceBetween direction="horizontal" size="xs">
              {editingName ? (
                <Input
                  value={queue.Name}
                  onKeyDown={e => {
                    if (e.detail.key === 'Enter' || e.detail.key === 'Escape') {
                      setEditingName(false)
                      e.stopPropagation()
                    }
                  }}
                  onChange={({detail}) => renameQueue(detail.value)}
                />
              ) : (
                <span>
                  Queue: {queue.Name}{' '}
                  <Button
                    variant="icon"
                    onClick={_e => setEditingName(true)}
                    iconName={'edit'}
                  ></Button>
                </span>
              )}
            </SpaceBetween>
          </Header>
        </Box>
        <ColumnLayout columns={2}>
          <FormField
            label={
              isMultiAZActive
                ? t('wizard.queues.subnet.label.multiple')
                : t('wizard.queues.subnet.label.single')
            }
            errorText={subnetError}
          >
            {isMultiAZActive ? (
              <SubnetMultiSelect
                value={subnetsList}
                onChange={onSubnetMultiSelectChange}
              />
            ) : (
              <SubnetSelect
                value={subnetsList[0]}
                onChange={onSubnetSelectChange}
              />
            )}
          </FormField>
          <FormField label={t('wizard.queues.purchaseType.label')}>
            <Select
              selectedOption={itemToDisplayIconOption(
                findFirst(capacityTypes, x => x[0] === capacityType) || [
                  '',
                  '',
                  null,
                ],
              )}
              onChange={({detail}) => {
                setState(capacityTypePath, detail.selectedOption.value)
              }}
              options={capacityTypes.map(itemToIconOption)}
            />
          </FormField>
          {isMultiInstanceTypesActive ? (
            <FormField label={t('wizard.queues.allocationStrategy.title')}>
              <Select
                options={allocationStrategyOptions}
                selectedOption={
                  allocationStrategyOptions.find(
                    as => as.value === allocationStrategy,
                  )!
                }
                onChange={setAllocationStrategy}
              />
            </FormField>
          ) : null}
        </ColumnLayout>
        <Box variant="div" margin={{vertical: 'xs'}}>
          <Toggle
            checked={enablePlacementGroup}
            disabled={!canUsePlacementGroup}
            onChange={_e => {
              setEnablePG(!enablePlacementGroup)
            }}
          >
            <Trans i18nKey="wizard.queues.placementGroup.label" />
          </Toggle>
        </Box>
        <ComputeResources queue={queue} index={index} canUseEFA={canUseEFA} />
        <ExpandableSection header="Advanced options">
          <SpaceBetween direction="vertical" size="s">
            <FormField label={t('wizard.queues.securityGroups.label')}>
              <SecurityGroups basePath={[...queuesPath, index]} />
            </FormField>
            <ActionsEditor
              basePath={[...queuesPath, index]}
              errorsPath={errorsPath}
            />
            <CustomAMISettings
              basePath={[...queuesPath, index]}
              appPath={['app', 'wizard', 'queues', index]}
              errorsPath={errorsPath}
              validate={queuesValidate}
            />
            <RootVolume
              basePath={[...queuesPath, index, 'ComputeSettings']}
              errorsPath={errorsPath}
            />
            <ExpandableSection header={t('wizard.queues.IamPolicies.label')}>
              <IamPoliciesEditor basePath={[...queuesPath, index]} />
            </ExpandableSection>
          </SpaceBetween>
        </ExpandableSection>
      </div>
    </div>
  )
}

function QueuesView() {
  const queues = useState(queuesPath) || []
  return (
    <SpaceBetween direction="vertical" size="l">
      {queues.map((queue: any, i: any) => (
        <Queue queue={queue} index={i} key={i} />
      ))}
    </SpaceBetween>
  )
}

function Queues() {
  const {t} = useTranslation()
  const isMemoryBasedSchedulingActive = useFeatureFlag(
    'memory_based_scheduling',
  )
  const adapter = useComputeResourceAdapter()
  const defaultAllocationStrategy = useDefaultAllocationStrategy()
  let queues = useState(queuesPath) || []

  const addQueue = () => {
    setState(
      [...queuesPath],
      [
        ...(queues || []),
        {
          Name: `queue${queues.length}`,
          ...defaultAllocationStrategy,
          ComputeResources: [adapter.createComputeResource(queues.length, 0)],
        },
      ],
    )
  }

  return (
    <ColumnLayout>
      {isMemoryBasedSchedulingActive && <SlurmMemorySettings />}
      <Container
        header={
          <Header variant="h2">{t('wizard.queues.container.title')}</Header>
        }
      >
        <QueuesView />
        <Box float="right">
          <Button
            disabled={queues.length >= 5}
            onClick={addQueue}
            iconName={'add-plus'}
          >
            {t('wizard.queues.addQueueButton.label')}
          </Button>
        </Box>
      </Container>
    </ColumnLayout>
  )
}

export const useDefaultAllocationStrategy = () => {
  const isMultiInstanceTypesActive = useFeatureFlag(
    'queues_multiple_instance_types',
  )
  return !isMultiInstanceTypesActive
    ? undefined
    : {
        AllocationStrategy: 'lowest-price',
      }
}

export const useComputeResourceAdapter = () => {
  const isMultiInstanceTypesActive = useFeatureFlag(
    'queues_multiple_instance_types',
  )
  return !isMultiInstanceTypesActive
    ? {
        ViewComponent: SingleInstanceCR.ComputeResource,
        updateComputeResourcesNames:
          SingleInstanceCR.updateComputeResourcesNames,
        createComputeResource: SingleInstanceCR.createComputeResource,
        validateComputeResources: SingleInstanceCR.validateComputeResources,
      }
    : {
        ViewComponent: MultiInstanceCR.ComputeResource,
        updateComputeResourcesNames:
          MultiInstanceCR.updateComputeResourcesNames,
        createComputeResource: MultiInstanceCR.createComputeResource,
        validateComputeResources: MultiInstanceCR.validateComputeResources,
      }
}

export const areMultiAZSelected = (subnets: string[]) => {
  if (subnets.length <= 1) {
    return {
      multiAZ: false,
      canUseEFA: true,
      canUsePlacementGroup: true,
    }
  }
  return {
    multiAZ: true,
    canUseEFA: false,
    canUsePlacementGroup: false,
  }
}

export function setSubnetsAndValidate(
  queueIndex: number,
  queueValidate: (index: number) => boolean,
  detail: MultiselectProps.MultiselectChangeDetail,
) {
  const subnetPath = [
    'app',
    'wizard',
    'config',
    'Scheduling',
    'SlurmQueues',
    queueIndex,
    'Networking',
    'SubnetIds',
  ]
  const subnetIds =
    detail.selectedOptions.map((option: any) => option.value) || []
  setState(subnetPath, subnetIds)
  queueValidate(queueIndex)
}

export {Queues, queuesValidate}
