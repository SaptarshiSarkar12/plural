import { Link, useOutletContext } from 'react-router-dom'
import { Div, Flex, Img, P } from 'honorable'
import moment from 'moment'
import Fuse from 'fuse.js'

import { useRepositoryContext } from '../../contexts/RepositoryContext'
import usePaginatedQuery from '../../hooks/usePaginatedQuery'
import InfiniteScroller from '../utils/InfiniteScroller'
import LoadingIndicator from '../utils/LoadingIndicator'

import { TERRAFORM_QUERY } from './queries'
import { packageCardStyle } from './RepositoryPackages'

const defaultTerraformIcon = '/terraform.png'
const defaultChartIcon = '/chart.png'
const defualtGcpIcon = '/gcp.png'
const defualtAzureIcon = '/azure.png'
const defaultAwsIcon = '/aws-icon.png'
const defaultEquinixIcon = '/equinix-metal.png'
const defaultKindIcon = '/kind.png'

const providerToIcon = {
  GCP: defualtGcpIcon,
  AWS: defaultAwsIcon,
  AZURE: defualtAzureIcon,
  EQUINIX: defaultEquinixIcon,
  KIND: defaultKindIcon,
  GENERIC: defaultChartIcon,
}

const searchOptions = {
  keys: ['name', 'description', 'latestVersion'],
  threshold: 0.25,
}

function Terraform({ terraform, first, last }: any) {
  return (
    <Flex
      as={Link}
      to={`/terraform/${terraform.id}`}
      {...packageCardStyle(first, last)}
    >
      <Img
        alt={terraform.name}
        width={64}
        height={64}
        src={defaultTerraformIcon}
      />
      <Div ml={1}>
        <Flex align="center">
          <P
            body1
            fontWeight={500}
          >
            {terraform.name}
          </P>
          {terraform.dependencies && terraform.dependencies.providers && (
            <Flex
              marginLeft="medium"
              gap="xsmall"
            >
              {terraform.dependencies.providers.map((provider) => (
                <Img
                  key={provider}
                  alt={provider}
                  src={providerToIcon[provider] || defaultChartIcon}
                  width={16}
                />
              ))}
            </Flex>
          )}
        </Flex>
        <P mt={0.5}>
          {terraform.latestVersion}{' '}
          {terraform.description ? `- ${terraform.description}` : null}
        </P>
      </Div>
      <Flex
        flexGrow={1}
        justifyContent="flex-end"
        color="text-xlight"
        caption
      >
        Created {moment(terraform.insertedAt).fromNow()}
      </Flex>
    </Flex>
  )
}

function RepositoryPackagesTerraform() {
  const { id } = useRepositoryContext()
  const [q] = useOutletContext() as any
  const [
    terraforms,
    loadingTerraforms,
    hasMoreTerraforms,
    fetchMoreTerraforms,
  ] = usePaginatedQuery(
    TERRAFORM_QUERY,
    {
      variables: {
        repositoryId: id,
      },
    },
    (data) => data.terraform
  )

  const fuse = new Fuse(terraforms, searchOptions)
  const filteredTerraforms = q
    ? fuse.search(q).map(({ item }) => item)
    : terraforms

  if (terraforms.length === 0 && loadingTerraforms) return <LoadingIndicator />

  return (
    <InfiniteScroller
      loading={loadingTerraforms}
      hasMore={hasMoreTerraforms}
      loadMore={fetchMoreTerraforms}
      // Allow for scrolling in a flexbox layout
      flexGrow={1}
      height={0}
    >
      {filteredTerraforms
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((terraform, i) => (
          <Terraform
            key={terraform.id}
            terraform={terraform}
            first={i === 0}
            last={i === filteredTerraforms.length - 1}
          />
        ))}
      {!filteredTerraforms?.length && (
        <Flex
          width="100%"
          padding="medium"
          backgroundColor="fill-one"
          border="1px solid border-fill-two"
          borderTop="none"
          borderBottomLeftRadius="4px"
          borderBottomRightRadius="4px"
        >
          No charts found.
        </Flex>
      )}
    </InfiniteScroller>
  )
}

export default RepositoryPackagesTerraform
