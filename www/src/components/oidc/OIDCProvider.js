import React, { useCallback, useState } from 'react'
import { Button, Select } from 'forge-core'
import { Box, Keyboard, Text, TextInput } from 'grommet'
import { useMutation } from 'react-apollo'
import { BindingInput, sanitize } from '../accounts/Role'
import { fetchGroups, fetchUsers } from '../accounts/Typeaheads'
import { CREATE_PROVIDER, UPDATE_PROVIDER } from './queries'
import { SectionPortal } from '../Explore'
import { GqlError } from '../utils/Alert'
import { deepUpdate, updateCache } from '../../utils/graphql'
import { REPO_Q } from '../repos/queries'
import { Attribute, Attributes } from '../integrations/Webhook'
import { AuthMethod } from './types'

function UrlTab({url, onClick}) {
  return (
    <Box background='light-3' round='xsmall'  pad={{vertical: '2px', horizontal: 'small'}} 
        hoverIndicator='light-5' onClick={onClick}>
      <Text size='small' weight={500}>{url}</Text>
    </Box>
  )
}

function UrlsInput({uriFormat, urls, setUrls}) {
  const [value, setValue] = useState('')
  const addUrl = useCallback(() => {
    const url = uriFormat ? uriFormat.replace('{domain}', value) : value
    setUrls([...urls, url])
    setValue('')
  }, [urls, value, setValue])

  return (
    <Keyboard onEnter={addUrl}>
      <Box flex={false} fill='horizontal' gap='xsmall'>
        <Box flex={false} fill='horizontal' direction='row' gap='small' align='center'>
          <TextInput
            plain
            value={value}
            placeholder={uriFormat ? 
              `enter a domain, and the uri will be formatted with ${uriFormat}` : 
              'add another redirect url'
            }
            onChange={({target: {value}}) => setValue(value)} />
          <Button label='Add' onClick={addUrl} />
        </Box>
        <Box direction='row' gap='small' align='center'>
          <Box flex={false}>
            <Text size='small' weight={500}>Redirect URIs</Text>
          </Box>
          <Box flex={false} fill='horizontal' direction='row' gap='xxsmall' align='center' wrap>
            {urls.map((url) => (
              <UrlTab 
                key={url} 
                url={url} 
                onClick={() => setUrls(urls.filter((u) => u !== url))} />
            ))}
          </Box>
        </Box>
      </Box>
    </Keyboard>
  )
}

export function ProviderForm({attributes, setAttributes, bindings, setBindings, repository}) {
  const settings = repository.oauthSettings || {}
  return (
    <Box fill gap='medium'>
      <UrlsInput 
        uriFormat={settings.uriFormat}
        urls={attributes.redirectUris} 
        setUrls={(redirectUris) => setAttributes({...attributes, redirectUris})} />
      <Box flex={false} gap='xsmall'>
        <BindingInput
          label='user bindings'
          placeholder='search for users to add'
          bindings={bindings.filter(({user}) => !!user).map(({user: {email}}) => email)}
          fetcher={fetchUsers}
          add={(user) => setBindings([...bindings, {user}])}
          remove={(email) => setBindings(bindings.filter(({user}) => !user || user.email !== email))} />
        <BindingInput
          label='group bindings'
          placeholder='search for groups to add'
          bindings={bindings.filter(({group}) => !!group).map(({group: {name}}) => name)}
          fetcher={fetchGroups}
          add={(group) => setBindings([...bindings, {group}])}
          remove={(name) => setBindings(bindings.filter(({group}) => !group || group.name !== name))} />
      </Box>
      {!settings.authMethod && (
        <Box gap='small' width='40%' direction='row' align='center'>
          <Box flex={false}>
            <Text size='small' weight={500}>Auth Method:</Text>
          </Box>
          <Box fill='horizontal'>
            <Select
              name='login-method'
              value={{value: attributes.authMethod, label: attributes.authMethod.toLocaleLowerCase()}}
              onChange={({value}) => setAttributes({...attributes, authMethod: value})}
              options={Object.values(AuthMethod).map((m) => ({
                label: m.toLocaleLowerCase(), 
                value: m
              }))} />
          </Box>
        </Box>
      )}
    </Box>
  )
}

export function CreateProvider({installation}) {
  const settings = installation.repository.oauthSettings || {}
  const [attributes, setAttributes] = useState({redirectUris: [], authMethod: settings.authMethod || AuthMethod.POST})
  const [bindings, setBindings] = useState([])
  const [mutation, {loading, error}] = useMutation(CREATE_PROVIDER, {
    variables: {id: installation.id, attributes: {
      ...attributes, bindings: bindings.map(sanitize)
    }},
    update: (cache, {data: {createOidcProvider}}) => updateCache(cache, {
      query: REPO_Q,
      variables: {repositoryId: installation.repository.id},
      update: (prev) => {
        console.log(prev)
        return deepUpdate(prev, 'repository.installation.oidcProvider', () => createOidcProvider)
      }
    })
  })

  return (
    <Box fill pad='medium' gap='small'>
      {error && <GqlError error={error} header='Could not create provider' />}
      <ProviderForm 
        repository={installation.repository}
        attributes={attributes} 
        setAttributes={setAttributes}
        bindings={bindings}
        setBindings={setBindings} />
      <SectionPortal>
        <Button label='Create' loading={loading} onClick={mutation} />
      </SectionPortal>
    </Box>
  )
}

export function UpdateProvider({installation}) {
  const provider = installation.oidcProvider
  const [attributes, setAttributes] = useState({
    redirectUris: provider.redirectUris, 
    authMethod: provider.authMethod
  })
  const [bindings, setBindings] = useState(provider.bindings)
  const [mutation, {loading, error}] = useMutation(UPDATE_PROVIDER, {
    variables: {id: installation.id, attributes: {...attributes, bindings: bindings.map(sanitize)}}
  })

  return (
    <Box fill pad='medium' gap='small'>
      {error && <GqlError error={error} header='Could not update provider' />}
      <Attributes>
        <Attribute width='100px' name='client id'>
          <Text size='small'>{provider.clientId}</Text>
        </Attribute>
        <Attribute width='100px' name='client secret'>
          <Text size='small'>{provider.clientSecret}</Text>
        </Attribute>
      </Attributes>
      <ProviderForm
        repository={installation.repository}
        attributes={attributes} 
        setAttributes={setAttributes}
        bindings={bindings}
        setBindings={setBindings} />
      <SectionPortal>
        <Button label='Update' loading={loading} onClick={mutation} />
      </SectionPortal>
    </Box>
  )
}

export function OIDCProvider({installation}) {
  if (installation.oidcProvider) return <UpdateProvider installation={installation} />
  return <CreateProvider installation={installation} />
}