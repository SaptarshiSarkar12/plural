defmodule Core.Services.Charts do
  use Core.Services.Base
  import Core.Policies.Chart

  alias Core.Services.Users
  alias Core.Schema.{Chart, User, Installation, Version}

  def get_chart(chart_id), do: Core.Repo.get(Chart, chart_id)

  def get_chart_version(chart_id, version),
    do: Core.Repo.get_by(Version, chart_id: chart_id, version: version)

  def create_chart(attrs, %User{} = user) do
    publisher = Users.get_publisher!(user.id)

    start_transaction()
    |> add_operation(:chart, fn _ ->
      %Chart{publisher_id: publisher.id}
      |> Chart.changeset(attrs)
      |> Core.Repo.insert()
    end)
    |> add_operation(:version, fn %{chart: %Chart{id: id, latest_version: v}} ->
      create_version(%{version: v}, id, user)
    end)
    |> execute(extract: :chart)
  end

  def create_version(attrs, chart_id, %User{} = user) do
    start_transaction()
    |> add_operation(:version, fn _ ->
      %Version{chart_id: chart_id}
      |> Version.changeset(attrs)
      |> allow(user, :create)
      |> when_ok(:insert)
    end)
    |> add_operation(:bump, fn %{version: %{version: v}} ->
      chart = get_chart(chart_id)
      case Elixir.Version.compare(v, chart.latest_version) do
        :gt -> update_latest_version(chart, v)
        _ -> {:ok, chart}
      end
    end)
    |> execute(extract: :version)
  end

  def create_installation(attrs, chart_id, %User{} = user) do
    %Installation{chart_id: chart_id, user_id: user.id}
    |> Installation.changeset(attrs)
    |> allow(user, :create)
    |> when_ok(:insert)
  end

  defp update_latest_version(%Chart{} = chart, v) do
    Chart.changeset(chart, %{latest_version: v})
    |> Core.Repo.update()
  end
end