defmodule JpegxlWeb.Router do
  use JpegxlWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {JpegxlWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", JpegxlWeb do
    pipe_through :browser

    get "/", PageController, :index
    get "/:page", PageController, :page
  end

  # Other scopes may use custom stacks.
  # scope "/api", JpegxlWeb do
  #   pipe_through :api
  # end
end
