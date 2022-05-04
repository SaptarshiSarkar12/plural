import { Link } from 'react-router-dom'
import { Div, P } from 'honorable'
import { RepositoryCard } from 'pluralsh-design-system'

import { useEffect } from 'react'

import { EXPLORE_REPOS } from '../repos/queries'
import usePaginatedQuery from '../../hooks/usePaginatedQuery'

import { LoopingLogo } from '../utils/AnimatedLogo'

function ExploreRepositories({ scrollRef }) {
  const [repositories, loadingRepositories, hasMoreRepositories, fetchMoreRepositories] = usePaginatedQuery(
    EXPLORE_REPOS,
    {
      variables: {
      },
    },
    data => data.repositories
  )

  useEffect(() => {
    const { current } = scrollRef

    if (!current) return

    function handleScroll(event) {
      if (!loadingRepositories && hasMoreRepositories && Math.abs(event.target.scrollTop - (event.target.scrollHeight - event.target.offsetHeight)) < 32) {
        fetchMoreRepositories()
      }
    }

    current.addEventListener('scroll', handleScroll)

    return () => {
      current.removeEventListener('scroll', handleScroll)
    }
  }, [scrollRef, fetchMoreRepositories, loadingRepositories, hasMoreRepositories])

  if (!repositories.length) {
    return (
      <Div
        pt={12}
        xflex="x5"
      >
        <LoopingLogo />
      </Div>
    )
  }

  const sortedRepositories = repositories.slice().sort((a, b) => a.name.localeCompare(b.name))
  const featuredA = sortedRepositories.shift()
  const featuredB = sortedRepositories.shift()

  return (
    <Div py={2}>
      <P
        px={3}
        body0
        fontWeight="bold"
      >
        Featured Repositories
      </P>
      <Div
        px={3}
        mt={1}
        xflex="x4s"
      >
        <RepositoryCard
          as={Link}
          to={`/repositories/${featuredA.id}`}
          flexGrow={1}
          flexShrink={0}
          flexBasis="calc(50% - 1 * 16px)"
          featured
          title={featuredA.name}
          imageUrl={featuredA.darkIcon || featuredA.icon}
          subtitle={featuredA.description}
        >
          {featuredA.description}
        </RepositoryCard>
        <RepositoryCard
          as={Link}
          to={`/repositories/${featuredB.id}`}
          ml={2}
          flexGrow={1}
          flexShrink={0}
          flexBasis="calc(50% - 1 * 16px)"
          featured
          title={featuredB.name}
          imageUrl={featuredB.darkIcon || featuredB.icon}
          subtitle={featuredB.description}
        >
          {featuredB.description}
        </RepositoryCard>
      </Div>
      <P
        px={3}
        mt={2}
        body0
        fontWeight="bold"
      >
        All Repositories
      </P>
      <Div
        px={2}
        mt={1}
        xflex="x11s"
      >
        {sortedRepositories.map(repository => console.log('repository', repository) || (
          <RepositoryCard
            as={Link}
            to={`/repositories/${repository.id}`}
            key={repository.id}
            mx={1}
            mb={2}
            flexGrow={1}
            flexShrink={0}
            flexBasis="calc(33.333% - 3 * 16px)"
            title={repository.name}
            imageUrl={repository.darkIcon || repository.icon}
            subtitle={repository.description}
          >
            {repository.description}
          </RepositoryCard>
        ))}
      </Div>
      {loadingRepositories && (
        <Div
          mt={2}
          xflex="x5"
        >
          <LoopingLogo />
        </Div>
      )}
    </Div>
  )
}

export default ExploreRepositories
