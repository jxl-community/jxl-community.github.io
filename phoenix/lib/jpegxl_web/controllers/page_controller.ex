defmodule JpegxlWeb.PageController do
  use JpegxlWeb, :controller

  def index(conn, _params) do
    # The home page is often custom made,
    # so skip the default app layout.
    render(conn, :index)
  end

  def page(%{request_path: "/" <> page} = conn, _params) do
    conn
    #|> assign(:page_title, title(page))
    |> render(String.to_atom(page))
  end
end
