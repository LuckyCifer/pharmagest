from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Pagination par défaut (20/page), avec ?page_size=N pour les listes
    utilisées comme source de menus déroulants (ex: choix d'un médicament
    dans une vente) qui ont besoin de tout récupérer en un seul appel."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 500
