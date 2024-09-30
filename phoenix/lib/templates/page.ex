defmodule JpegxlWeb.PageHTML do
  @moduledoc """
  This module contains pages rendered by PageController.

  See the `page_html` directory for all templates available.
  """
  use JpegxlWeb, :html

  embed_templates "page/*"

  def jpegvsjxl_data() do
    %{
      "quality" => Jason.decode!(File.read!("data/JPEG_CompareSizeSameQuality.json")),
      "size" => Jason.decode!(File.read!("data/JPEG_CompareQualitySameSize.json"))
    }
    |> Jason.encode!()
  end
end
