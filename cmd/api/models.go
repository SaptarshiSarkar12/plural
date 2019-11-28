package api

import (
	"fmt"
)

type PageInfo struct {
	HasNextPage bool
	EndCursor   string
}

type Publisher struct {
	Id   string
	Name string
}

type Repository struct {
	Id        string
	Name      string
	Publisher Publisher
}

type User struct {
	Id        string
	Name      string
	Email     string
	Publisher Publisher
}

type Chart struct {
	Id            string
	Name          string
	Description   string
	LatestVersion string
}

type ChartInstallation struct {
	Id           string
	Chart        Chart
	Version      Version
	Installation Installation
}

type Version struct {
	Id             string
	Version        string
	Readme         string
	ValuesTemplate string
}

type Terraform struct {
	Id             string
	Name           string
	Description    string
	ValuesTemplate string
	Dependencies   Dependencies
	Package        string
}

type Dependencies struct {
	Dependencies []Dependency
	Wirings Wirings
}

type Dependency struct {
	Type string
	Repo string
	Name string
}

type Wirings struct {
	Terraform map[string]string
	Helm map[string]string
}

type TerraformInstallation struct {
	Id           string
	Installation Installation
	Terraform    Terraform
}

type Installation struct {
	Repository Repository
	User       User
	License    string
	Context    map[string]interface{}
}

type InstallationEdge struct {
	Node Installation
}

type ChartEdge struct {
	Node Chart
}

type TerraformEdge struct {
	Node Terraform
}

type VersionEdge struct {
	Node Version
}

type ChartInstallationEdge struct {
	Node ChartInstallation
}

type TerraformInstallationEdge struct {
	Node TerraformInstallation
}

const RepositoryFragment = `
	fragment RepositoryFragment on Repository {
		id
		name
		publisher {
			name
		}
	}
`

var InstallationFragment = fmt.Sprintf(`
	fragment InstallationFragment on Installation {
		id
		context
		license
		repository {
			...RepositoryFragment
		}
	}
	%s
`, RepositoryFragment)

const ChartFragment = `
	fragment ChartFragment on Chart {
		id
		name
		description
		latestVersion
	}
`

const VersionFragment = `
	fragment VersionFragment on Version {
		id
		version
		readme
		valuesTemplate
	}
`

var ChartInstallationFragment = fmt.Sprintf(`
	fragment ChartInstallationFragment on ChartInstallation {
		id
		chart {
			...ChartFragment
		}
		version {
			...VersionFragment
		}
	}
	%s
	%s
`, ChartFragment, VersionFragment)

const TerraformFragment = `
	fragment TerraformFragment on Terraform {
		id
		name
		package
		description
		dependencies {
			dependencies {
				type
				repo
				name
			}
			wirings {
				terraform
				helm
			}
		}
		valuesTemplate
	}
`

var TerraformInstallationFragment = fmt.Sprintf(`
	fragment TerraformInstallationFragment on TerraformInstallation {
		id
		terraform {
			...TerraformFragment
		}
	}
	%s
`, TerraformFragment)
