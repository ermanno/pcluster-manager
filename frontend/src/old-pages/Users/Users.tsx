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
import React from 'react'
import {useSelector} from 'react-redux'
import {useCollection} from '@cloudscape-design/collection-hooks'
import {clearState, setState, getState, useState} from '../../store'

import {CreateUser, DeleteUser, ListUsers} from '../../model'

// UI Elements
import {
  Button,
  FormField,
  Header,
  Input,
  Pagination,
  SpaceBetween,
  Table,
  TextFilter,
} from '@cloudscape-design/components'

// Components
import EmptyState from '../../components/EmptyState'
import DateView from '../../components/DateView'
import {
  DeleteDialog,
  showDialog,
  hideDialog,
} from '../../components/DeleteDialog'
import Layout from '../Layout'
import {DefaultHelpPanel} from '../../components/help-panel/DefaultHelpPanel'
import {useHelpPanel} from '../../components/help-panel/HelpPanel'
import {useTranslation} from 'react-i18next'

// Constants
const errorsPath = ['app', 'wizard', 'errors', 'user']

// selectors
const selectUserIndex = (state: any) => state.users.index

function UserActions({user}: any) {
  const {t} = useTranslation()

  let email = useState(['identity', 'attributes', 'email'])
  return (
    <SpaceBetween direction="horizontal" size="s">
      <Button
        disabled={email === user.Attributes.email}
        className="action"
        onClick={() => {
          setState(['app', 'user', 'delete'], user)
          showDialog('deleteUser')
        }}
      >
        {t('users.actions.delete')}
      </Button>
    </SpaceBetween>
  )
}

const usersSlug = 'users'
export default function Users(props: any) {
  const {t} = useTranslation()
  const loading = !useSelector(selectUserIndex)
  const user_index = useSelector(selectUserIndex) || {}
  const usernames = Object.keys(user_index).sort()
  const users = usernames.map(username => user_index[username])
  const userEmail = useState(['app', 'user', 'delete', 'Attributes', 'email'])
  const deletedUser = useState(['app', 'user', 'delete'])

  const error = useState([...errorsPath, 'username'])

  const newUser = useState(['app', 'users', 'newUser'])

  const usernamePath = ['app', 'users', 'newUser', 'Username']
  const username = useState(usernamePath)

  const userphonePath = ['app', 'users', 'newUser', 'Phonenumber']
  const userphone = useState(userphonePath)

  useHelpPanel(<DefaultHelpPanel />)

  React.useEffect(() => {
    ListUsers()
  }, [])

  const enableMfa = useState(['app', 'enableMfa'])
  const refreshUsers = () => {
    ListUsers()
  }

  const createUser = () => {
    userValidate()
    const validated = getState([...errorsPath, 'validated'])
    if (validated) {
      CreateUser(newUser, () => {
        clearState(['app', 'users', 'newUser'])
      })
    }
  }

  const {
    items,
    actions,
    filteredItemsCount,
    collectionProps,
    filterProps,
    paginationProps,
  } = useCollection(users || [], {
    filtering: {
      empty: (
        <EmptyState
          title={t('users.list.filtering.empty.title')}
          subtitle={t('users.list.filtering.empty.subtitle')}
          action={<></>}
        />
      ),
      noMatch: (
        <EmptyState
          title={t('users.list.filtering.noMatch.title')}
          subtitle={t('users.list.filtering.noMatch.subtitle')}
          action={
            <Button onClick={() => actions.setFiltering('')}>
              {t('users.list.filtering.noMatch.action')}
            </Button>
          }
        />
      ),
    },
    pagination: {pageSize: 10},
    sorting: {},
    selection: {},
  })

  const deleteUser = () => {
    console.log(deletedUser)
    DeleteUser(deletedUser, (returned_user: any) => {
      clearState(['users', 'index', returned_user.Username])
    })
    hideDialog('deleteUser')
  }

  return (
    <Layout pageSlug={usersSlug}>
      <DeleteDialog
        id="deleteUser"
        header={t('users.list.dialogs.delete.title')}
        deleteCallback={deleteUser}
      >
        {t('users.list.dialogs.delete.body', {userEmail})}
      </DeleteDialog>
      <Table
        {...collectionProps}
        resizableColumns
        trackBy={item => item.Attributes && item.Attributes.email}
        variant="full-page"
        stickyHeader
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={users && `(${Object.keys(users).length})`}
            description={t('users.header.description')}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                {enableMfa && (
                  <Input
                    inputMode="tel"
                    onChange={({detail}) =>
                      setState(userphonePath, detail.value)
                    }
                    value={userphone}
                    placeholder={t(
                      'users.list.createForm.phoneNumberPlaceholder',
                    )}
                  ></Input>
                )}
                <div onKeyPress={e => e.key === 'Enter' && createUser()}>
                  <FormField errorText={error}>
                    <Input
                      onChange={({detail}) =>
                        setState(usernamePath, detail.value)
                      }
                      value={username}
                      placeholder={t('users.list.createForm.emailPlaceholder')}
                    ></Input>
                  </FormField>
                </div>
                <Button className="action" onClick={createUser}>
                  {t('users.actions.create')}
                </Button>
                <Button
                  className="action"
                  onClick={refreshUsers}
                  iconName={'refresh'}
                >
                  {t('users.actions.refresh')}
                </Button>
              </SpaceBetween>
            }
          >
            {t('users.header.title')}
          </Header>
        }
        columnDefinitions={[
          {
            id: 'username',
            header: t('users.list.columns.username'),
            cell: item => item.Username,
            sortingField: 'Username',
          },
          {
            id: 'email',
            header: t('users.list.columns.email'),
            cell: item => item.Attributes.email || '-',
            sortingField: 'Attributes.email',
          },
          {
            id: 'created',
            header: t('users.list.columns.created'),
            cell: item => <DateView date={item.UserCreateDate} />,
            sortingField: 'UserCreateDate',
          },
          {
            id: 'action',
            header: t('users.list.columns.action'),
            cell: item => <UserActions user={item} /> || '-',
          },
        ]}
        loading={loading}
        items={items}
        loadingText={t('users.list.filtering.loadingText')}
        pagination={<Pagination {...paginationProps} />}
        filter={
          <TextFilter
            {...filterProps}
            countText={t('users.list.filtering.countText', {
              filteredItemsCount,
            })}
            filteringAriaLabel={t('users.list.filtering.filteringAriaLabel')}
            filteringPlaceholder={t(
              'users.list.filtering.filteringPlaceholder',
            )}
          />
        }
      />
    </Layout>
  )
}

function userValidate() {
  const username = getState(['app', 'users', 'newUser', 'Username'])
  setState([...errorsPath, 'validated'], true)
  let valid = true

  const regex = /^([a-zA-Z0-9_.-])+@(([a-zA-Z0-9-])+.)+([a-zA-Z0-9]{2,4})+$/
  if (!regex.test(username)) {
    setState([...errorsPath, 'username'], 'You must enter a valid email.')
    valid = false
    setState([...errorsPath, 'validated'], false)
  } else {
    clearState([...errorsPath, 'username'])
  }

  return valid
}
