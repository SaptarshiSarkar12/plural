import React, { useContext, useState, useEffect } from 'react'
import { Box, RadioButtonGroup, Text } from 'grommet'
import { useFilePicker } from 'react-sage'
import { Button, InputCollection, ResponsiveInput } from 'forge-core'
import { useMutation } from 'react-apollo'
import { UPDATE_USER } from './queries'
import Avatar from './Avatar'
import { StatusCritical, Checkmark, User, Lock, Install, Robot, License } from 'grommet-icons'
import Installations from '../repos/Installations'
import { CurrentUserContext } from '../login/CurrentUser'
import { Tokens } from './Tokens'
import { useHistory, useParams } from 'react-router'
import { BreadcrumbsContext } from '../Breadcrumbs'
import { SIDEBAR_WIDTH } from '../constants'
import { Keys } from './Keys'
import { SectionContentContainer, SectionPortal } from '../Explore'
import { LoginMethod } from './types'

export const EditContext = React.createContext({})

function EditAvatar({me}) {
  const {files, onClick, HiddenFileInput} = useFilePicker({})
  const [mutation] = useMutation(UPDATE_USER)
  useEffect(() => {
    if (files.length > 0) {
      mutation({variables: {attributes: {avatar: files[0]}}})
    }
  }, [files])

  return (
    <>
      <Avatar user={me} size='50px' onClick={onClick} />
      <HiddenFileInput accept='.jpg, .jpeg, .png' multiple={false} />
    </>
  )
}

export function EditSelect({name, edit, icon, base}) {
  const {editing} = useParams()
  let hist = useHistory()
  return (
    <Box pad='small' round='xsmall' background={editing === edit ? 'sidebar' : null} focusIndicator={false} 
         fill='horizontal' align='center' gap='small' direction='row' hoverIndicator='sidebar'
         onClick={edit === editing ? null : () => hist.push(`${base || '/me/edit/'}${edit}`)}>
      <Box flex={false}>
        {icon}
      </Box>
      <Box fill='horizontal'>
        {name}
      </Box>
    </Box>
  )
}

export function EditHeader({text}) {
  return (
    <Box fill='horizontal' direction='row' justify='center' margin={{bottom: 'small'}}>
      <Text size='small' weight={500}>{text}</Text>
    </Box>
  )
}

export function EditContent({edit, name, children}) {
  const {editing} = useParams()
  if (editing !== edit) return null

  return (
    <SectionContentContainer header={name}>
      {children}
    </SectionContentContainer>
  )
}

function passwordValid(password, confirm) {
  if (password === '') return {disabled: true, reason: 'please enter a password'}
  if (password !== confirm) return {disabled: true, reason: 'passwords must match'}
  if (password.length < 12) return {disabled: true, reason: 'passwords must be more than 12 characters'}
  return {disabled: false, reason: 'passwords match!'}
}

export default function EditUser() {
  const me = useContext(CurrentUserContext)
  console.log(me)
  const [attributes, setAttributes] = useState({name: me.name, email: me.email, loginMethod: me.loginMethod})
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const {editing} = useParams()
  const mergedAttributes = password && password.length > 0 ? {...attributes, password} : attributes
  const [mutation, {loading}] = useMutation(UPDATE_USER, {variables: {attributes: mergedAttributes}})
  const {disabled, reason} = passwordValid(password, confirm)
  const color = disabled ? 'status-error' : 'status-ok'

  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  useEffect(() => {
    setBreadcrumbs([{url: `/me/edit`, text: 'me'}, {url: `/me/edit/${editing}`, text: editing}])
  }, [setBreadcrumbs, editing])

  return (
    <Box fill>
      <Box fill direction='row'>
        <Box flex={false} background='backgroundColor' gap='xsmall' width={SIDEBAR_WIDTH} pad={{horizontal: 'small', vertical: 'medium'}}>
          <Box flex={false} direction='row' gap='small' align='center' margin={{bottom: 'xsmall'}}>
            <EditAvatar me={me} />
            <Box flex={false}>
              <Text size='small' weight='bold'>{attributes.name}</Text>
              <Text size='small'>{attributes.email}</Text>
            </Box>
          </Box>
          <EditSelect edit='user' name='User Attributes' icon={<User size='14px' />} />
          <EditSelect edit='pwd' name='Password' icon={<Lock size='14px' />} />
          <EditSelect edit='installations' name='Installations' icon={<Install size='14px' />} />
          <EditSelect edit='tokens' name='Access Tokens' icon={<Robot size='14px' />} />
          <EditSelect edit='keys' name='Public Keys' icon={<License size='14px' />} />
        </Box>
        <Box fill>
          <EditContent edit='user' name='User Attributes'>
            <Box pad='small' gap='small'>
              <InputCollection>
                <ResponsiveInput
                  value={attributes.name}
                  label='name'
                  onChange={({target: {value}}) => setAttributes({...attributes, name: value})} />
                <ResponsiveInput
                  value={attributes.email}
                  label='email'
                  onChange={({target: {value}}) => setAttributes({...attributes, email: value})} />
              </InputCollection>
              <Box gap='small'>
                <Text size='small' weight={500}>Login Method:</Text>
                <RadioButtonGroup
                  name='login-method'
                  value={attributes.loginMethod}
                  onChange={({target: {value}}) => setAttributes({...attributes, loginMethod: value})}
                  options={Object.values(LoginMethod).map((m) => ({
                    label: m.toLocaleLowerCase(), 
                    value: m
                  }))} />
              </Box>
              <SectionPortal>
                <Button loading={loading} onClick={mutation} flex={false} label='Update' />
              </SectionPortal>
            </Box>
          </EditContent>
          <EditContent edit='pwd' name='Password'>
            <Box pad='small'>
              <InputCollection>
                <ResponsiveInput
                  value={password}
                  label='password'
                  type='password'
                  onChange={({target: {value}}) => setPassword(value)} />
                <ResponsiveInput
                  value={confirm}
                  label='confirm'
                  type='password'
                  onChange={({target: {value}}) => setConfirm(value)} />
              </InputCollection>
              <SectionPortal>
                <Box flex={false} gap='small' direction='row' align='center'>
                  {disabled ?
                    <StatusCritical size='15px' color={color} /> :
                    <Checkmark size='15px' color={color} />}
                  <Text size='small' color={color}>
                    {reason}
                  </Text>
                  <Button
                    disabled={disabled}
                    loading={loading}
                    onClick={mutation}
                    label='Update' />
                </Box>
              </SectionPortal>
            </Box>
          </EditContent>
          <EditContent edit='installations' name='Installations'>
            <Box fill pad='small'>
              <Installations edit />
            </Box>
          </EditContent>
          <EditContent edit='tokens' name='Tokens'>
            <Tokens />
          </EditContent>
          <EditContent edit='keys' name='Public Keys'>
            <Keys />
          </EditContent>
        </Box>
      </Box>
    </Box>
  )
}