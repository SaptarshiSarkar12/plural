import 'xterm/css/xterm.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useApolloClient, useSubscription } from '@apollo/client'
import moment from 'moment'
import { Div, Flex, P, Span } from 'honorable'
import { FitAddon } from 'xterm-addon-fit'
import {
  ArrowLeftIcon,
  Button,
  Chip,
  CollapseIcon,
  ErrorIcon,
  ListIcon,
  PageTitle,
  StatusIpIcon,
  StatusOkIcon,
} from '@pluralsh/design-system'
import { Terminal } from 'xterm'

import { useRepositoryContext } from '../../contexts/RepositoryContext'
import usePaginatedQuery from '../../hooks/usePaginatedQuery'
import InfiniteScroller from '../utils/InfiniteScroller'
import { Table, TableData, TableRow } from '../utils/Table'
import { XTermTheme } from '../../theme'

import LoadingIndicator from '../utils/LoadingIndicator'

import { TESTS_QUERY } from './queries'
import { RepositoryActions } from './misc'
import { LOGS_SUB, TEST_LOGS } from './packages/queries'

const statusAttrs = {
  QUEUED: { severity: 'neutral', icon: <StatusIpIcon /> },
  RUNNING: { severity: 'info', loading: true },
  SUCCEEDED: { severity: 'success', icon: <StatusOkIcon /> },
  FAILED: { severity: 'error', icon: <ErrorIcon /> },
}

function Status({ status }: any) {
  return (
    <Chip
      {...statusAttrs[status]}
      backgroundColor="fill-two"
      borderColor="border-fill-two"
    >
      {status.toLowerCase()}
    </Chip>
  )
}

async function fetchLogs(client, id, step, term) {
  const { data } = await client.query({
    query: TEST_LOGS,
    variables: { id, step },
  })

  if (data && data.testLogs) {
    const lines = data.testLogs.split(/\r?\n/)

    for (const l of lines) {
      term.writeln(l)
    }
  }
}

function TestLogs({ step: { id, hasLogs }, testId }: any) {
  const client = useApolloClient()
  const terminalRef = useRef<HTMLDivElement>()
  const fitAddon = useMemo(() => new FitAddon(), [])
  const terminal = useMemo(
    () =>
      new Terminal({
        theme: XTermTheme,
        disableStdin: false,
        rightClickSelectsWord: true,
      }),
    []
  )
  const { data } = useSubscription(LOGS_SUB, {
    variables: { testId },
  })

  useEffect(() => {
    if (!terminalRef?.current) return

    terminal.loadAddon(fitAddon)

    // Set up the terminal
    terminal.open(terminalRef.current!)

    try {
      fitAddon.fit()
    } catch (error) {
      console.error(error)
    }
  }, [terminalRef, fitAddon, terminal])

  useEffect(() => {
    if (data && data.testLogs && data.testLogs.step.id === id) {
      for (const l of data.testLogs.logs) {
        terminal.writeln(l)
      }
    }
  }, [data, id, terminal])

  useEffect(() => {
    if (!hasLogs) return

    terminal.clear()
    fetchLogs(client, testId, id, terminal)
  }, [hasLogs, client, testId, id, terminal])

  return (
    <Div
      maxHeight="520px"
      borderColor="border-fill-two"
      margin="medium"
    >
      <Div
        backgroundColor="fill-two"
        padding="medium"
        borderRadius="large"
        border="1px solid border"
        borderColor="border-fill-two"
      >
        <Div
          id="terminal"
          ref={terminalRef}
        />
      </Div>
    </Div>
  )
}

function Test({ test, last, setTest }: any) {
  return (
    <TableRow
      last={last}
      hoverIndicator="fill-one-hover"
      onClick={() => setTest(test)}
      cursor="pointer"
      suffix={<ListIcon size={16} />}
    >
      <TableData>{test.promoteTag}</TableData>
      <TableData>{test.name}</TableData>
      <TableData>
        <P body2>{moment(test.insertedAt).format('MMM DD, YYYY')}</P>
        <P
          caption
          color="text-xlight"
        >
          {moment(test.insertedAt).format('hh:mm a')}
        </P>
      </TableData>
      <TableData>
        <P body2>{moment(test.updatedAt).format('MMM DD, YYYY')}</P>
        <P
          caption
          color="text-xlight"
        >
          {moment(test.updatedAt).format('hh:mm a')}
        </P>
      </TableData>
      <TableData>
        <Status status={test.status} />
      </TableData>
    </TableRow>
  )
}

function TestStep({ step, test, last }: any) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TableRow
        last={open || last}
        onClick={() => setOpen(!open)}
        hoverIndicator="fill-one-hover"
        cursor="pointer"
      >
        <TableData>
          <CollapseIcon
            size={8}
            style={
              open
                ? {
                    transform: 'rotate(270deg)',
                    transitionDuration: '.2s',
                    transitionProperty: 'transform',
                  }
                : {
                    transform: 'rotate(180deg)',
                    transitionDuration: '.2s',
                    transitionProperty: 'transform',
                  }
            }
          />
        </TableData>
        <TableData>{step.name}</TableData>
        <TableData>{step.description}</TableData>
        <TableData>
          <P body2>
            {moment(step.updatedAt || step.insertedAt).format('MMM DD, YYYY')}
          </P>
          <P
            caption
            color="text-xlight"
          >
            {moment(step.updatedAt || step.insertedAt).format('hh:mm a')}
          </P>
        </TableData>
        <TableData>
          <Status status={step.status} />
        </TableData>
      </TableRow>
      {open && (
        <TestLogs
          step={step}
          testId={test.id}
          close={() => setOpen(false)}
        />
      )}
    </>
  )
}

function TestDetail({ test, setTest }: any) {
  const len = test.steps.length

  return (
    <>
      <PageTitle heading="Tests" />
      <Button
        secondary
        startIcon={<ArrowLeftIcon size={16} />}
        onClick={() => setTest(null)}
        justifyContent="start"
        marginBottom="medium"
      >
        Back
      </Button>
      <Table
        headers={['', 'Name', 'Description', 'Last updated', 'Status']}
        sizes={['5%', '10%', '50%', '15%', '20%']}
        background="fill-one"
        width="100%"
        heading={test.name}
        overflow="overlay"
      >
        <Div overflow="overlay">
          {test.steps.map((step, i) => (
            <TestStep
              key={`${step}-${i}`}
              step={step}
              last={i === len - 1}
              test={test}
            />
          ))}
        </Div>
      </Table>
    </>
  )
}

function RepositoryTests() {
  const { id } = useRepositoryContext()
  const [test, setTest] = useState<any>(null)
  const [tests, loadingTests, hasMoreTests, fetchMoreTests] = usePaginatedQuery(
    TESTS_QUERY,
    {
      variables: {
        repositoryId: id,
      },
    },
    (data) => data.tests
  )

  if (tests.length === 0 && loadingTests) {
    return <LoadingIndicator />
  }

  if (test) {
    return (
      <TestDetail
        test={test}
        setTest={setTest}
      />
    )
  }

  return (
    <Flex
      direction="column"
      flexGrow={1}
    >
      <PageTitle heading="Tests">
        <Flex display-desktop-up="none">
          <RepositoryActions />
        </Flex>
      </PageTitle>
      <Flex
        direction="column"
        flexGrow={1}
        marginBottom="xlarge"
      >
        {tests?.length ? (
          <Table
            headers={[
              'Promote to',
              'Name',
              'Created on',
              'Last updated',
              'Status',
            ]}
            sizes={['15%', '35%', '15%', '15%', '20%']}
            background="fill-one"
            width="100%"
            height="100%"
          >
            <InfiniteScroller
              pb={4}
              loading={loadingTests}
              hasMore={hasMoreTests}
              loadMore={fetchMoreTests}
              // Allow for scrolling in a flexbox layout
              flexGrow={1}
              height={0}
            >
              {Array.from(new Set(tests)).map((test, id) => (
                <Test
                  key={`${(test as any).id}${id}`}
                  test={test}
                  setTest={setTest}
                />
              ))}
            </InfiniteScroller>
          </Table>
        ) : (
          <Span>This repository does not have any tests yet.</Span>
        )}
      </Flex>
    </Flex>
  )
}

export default RepositoryTests
