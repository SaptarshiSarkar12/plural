defmodule GraphQl.Schema.Repository do
  use GraphQl.Schema.Base
  alias GraphQl.Resolvers.{
    User,
    Payments,
    Repository
  }

  ### INPUTS

  input_object :repository_attributes do
    field :name,          :string
    field :description,   :string
    field :documentation, :string
    field :secrets,       :yml
    field :icon,          :upload_or_url
    field :integration_resource_definition, :resource_definition_attributes
    field :tags,          list_of(:tag_attributes)
    field :dashboards,    list_of(:dashboard_attributes)
    field :database,      :database_attributes
    field :shell,         :shell_attributes
  end

  input_object :installation_attributes do
    field :context,      :yml
    field :auto_upgrade, :boolean
    field :track_tag,    :string
  end

  input_object :integration_attributes do
    field :name,          non_null(:string)
    field :icon,          :upload_or_url
    field :source_url,    :string
    field :description,   :string
    field :type,          :string
    field :spec,          :yml
    field :tags,          list_of(:tag_attributes)
  end

  input_object :resource_definition_attributes do
    field :name, non_null(:string)
    field :spec, list_of(:specification_attributes)
  end

  ecto_enum :spec_datatype, Core.Schema.ResourceDefinition.Specification.Type

  input_object :specification_attributes do
    field :name,     non_null(:string)
    field :type,     non_null(:spec_datatype)
    field :inner,    :spec_datatype
    field :spec,     list_of(:specification_attributes)
    field :required, :boolean
  end

  input_object :artifact_attributes do
    field :name,     non_null(:string)
    field :readme,   non_null(:string)
    field :type,     non_null(:string)
    field :platform, non_null(:string)
    field :blob,     :upload_or_url
  end

  input_object :dashboard_attributes do
    field :name, non_null(:string)
    field :uid,  non_null(:string)
  end

  input_object :shell_attributes do
    field :target,  non_null(:string)
    field :command, :string
    field :args,    list_of(:string)
  end

  ecto_enum :engine, Core.Schema.Database.Engine

  input_object :database_attributes do
    field :engine,      non_null(:engine)
    field :target,      non_null(:string)
    field :port,        non_null(:integer)
    field :credentials, :credentials_attributes
    field :name,        non_null(:string)
  end

  input_object :credentials_attributes do
    field :user,   non_null(:string)
    field :secret, non_null(:string)
    field :key,    non_null(:string)
  end

  ## OBJECTS

  object :installation do
    field :id,           :id
    field :context,      :map
    field :auto_upgrade, :boolean
    field :repository,   :repository, resolve: dataloader(Repository)
    field :user,         :user, resolve: dataloader(User)
    field :subscription, :repository_subscription, resolve: dataloader(Payments)
    field :track_tag,    non_null(:string)

    field :license, :string, resolve: fn
      installation, _, _ -> Core.Services.Repositories.generate_license(installation)
    end

    timestamps()
  end

  object :repository do
    field :id,            :id
    field :name,          non_null(:string)
    field :description,   :string
    field :documentation, :string
    field :publisher,     :publisher, resolve: dataloader(User)
    field :plans,         list_of(:plan), resolve: dataloader(Payments)
    field :tags,          list_of(:tag), resolve: dataloader(Repository)
    field :artifacts,     list_of(:artifact), resolve: dataloader(Repository)
    field :dashboards,    list_of(:dashboard), resolve: dataloader(Repository)
    field :shell,         :shell, resolve: dataloader(Repository)
    field :database,      :database, resolve: dataloader(Repository)

    field :icon, :string, resolve: fn
      repo, _, _ -> {:ok, Core.Storage.url({repo.icon, repo}, :original)}
    end

    field :installation, :installation, resolve: fn
      repo, _, context -> Repository.resolve_installation(repo, context)
    end

    field :editable, :boolean, resolve: fn
      repo, _, %{context: %{current_user: user}} -> Repository.editable(repo, user)
    end

    field :secrets, :map, resolve: fn
      repo, _, %{context: %{current_user: user}} -> Repository.protected_field(repo, user, :secrets)
    end

    field :public_key, :string, resolve: fn
      repo, _, %{context: %{current_user: user}} -> Repository.resolve_public_key(repo, user)
    end

    timestamps()
  end

  object :dashboard do
    field :id,   non_null(:id)
    field :name, non_null(:string)
    field :uid,  non_null(:string)

    timestamps()
  end

  object :database do
    field :id,          non_null(:id)
    field :engine,      non_null(:engine)
    field :target,      non_null(:string)
    field :port,        non_null(:integer)
    field :name,        non_null(:string)
    field :credentials, :credentials

    timestamps()
  end

  object :credentials do
    field :user,   non_null(:string)
    field :secret, non_null(:string)
    field :key,    non_null(:string)
  end

  object :shell do
    field :id,      non_null(:id)
    field :target,  non_null(:string)
    field :command, :string
    field :args,    list_of(:string)

    timestamps()
  end

  object :artifact do
    field :id,       :id
    field :name,     :string
    field :readme,   :string
    field :type,     :artifact_type
    field :platform, :artifact_platform
    field :filesize, :integer
    field :sha,      :string
    field :blob, :string, resolve: fn
      artifact, _, _ -> {:ok, Core.Storage.url({artifact.blob, artifact}, :original)}
    end

    timestamps()
  end

  ecto_enum :artifact_type, Core.Schema.Artifact.Type
  ecto_enum :artifact_platform, Core.Schema.Artifact.Platform

  object :integration do
    field :id,          non_null(:id)
    field :name,        non_null(:string)
    field :source_url,  :string
    field :description, :string
    field :type,        :string
    field :spec,        :map

    field :icon, :string, resolve: fn
      integration, _, _ -> {:ok, Core.Storage.url({integration.icon, integration}, :original)}
    end

    field :repository, :repository, resolve: dataloader(Repository)
    field :publisher,  :publisher, resolve: dataloader(User)
    field :tags,       list_of(:tag), resolve: dataloader(Repository)

    timestamps()
  end

  connection node_type: :repository
  connection node_type: :installation
  connection node_type: :integration

  object :repository_queries do
    field :repository, :repository do
      middleware GraphQl.Middleware.Authenticated
      arg :id,   :id
      arg :name, :string

      resolve &Repository.resolve_repository/2
    end


    connection field :repositories, node_type: :repository do
      middleware GraphQl.Middleware.Authenticated
      arg :publisher_id, :id
      arg :tag,          :string

      resolve &Repository.list_repositories/2
    end

    connection field :search_repositories, node_type: :repository do
      middleware GraphQl.Middleware.Authenticated
      arg :query, non_null(:string)

      resolve &Repository.search_repositories/2
    end

    connection field :installations, node_type: :installation do
      middleware GraphQl.Middleware.Authenticated

      resolve &Repository.list_installations/2
    end

    connection field :integrations, node_type: :integration do
      arg :repository_id,   :id
      arg :repository_name, :string
      arg :tag,             :string
      arg :type,            :string

      resolve &Repository.list_integrations/2
    end
  end

  object :repository_mutations do
    field :create_repository, :repository do
      middleware GraphQl.Middleware.Authenticated
      arg :attributes, non_null(:repository_attributes)

      resolve safe_resolver(&Repository.create_repository/2)
    end


    field :update_repository, :repository do
      middleware GraphQl.Middleware.Authenticated
      arg :repository_id,   :id
      arg :repository_name, :string
      arg :attributes,      non_null(:repository_attributes)

      resolve safe_resolver(&Repository.update_repository/2)
    end

    field :delete_repository, :repository do
      middleware GraphQl.Middleware.Authenticated
      arg :repository_id, non_null(:id)

      resolve safe_resolver(&Repository.delete_repository/2)
    end

    field :create_installation, :installation do
      middleware GraphQl.Middleware.Authenticated
      arg :repository_id, non_null(:id)

      resolve safe_resolver(&Repository.create_installation/2)
    end

    field :update_installation, :installation do
      middleware GraphQl.Middleware.Authenticated
      arg :id, non_null(:id)
      arg :attributes, non_null(:installation_attributes)

      resolve safe_resolver(&Repository.update_installation/2)
    end

    field :delete_installation, :installation do
      middleware GraphQl.Middleware.Authenticated
      arg :id, non_null(:id)

      resolve safe_resolver(&Repository.delete_installation/2)
    end

    field :create_integration, :integration do
      middleware GraphQl.Middleware.Authenticated
      arg :repository_name, non_null(:string)
      arg :attributes, non_null(:integration_attributes)

      resolve safe_resolver(&Repository.upsert_integration/2)
    end

    field :create_artifact, :artifact do
      middleware GraphQl.Middleware.Authenticated
      arg :repository_id,   :id
      arg :repository_name, :string
      arg :attributes, non_null(:artifact_attributes)

      resolve safe_resolver(&Repository.create_artifact/2)
    end
  end
end